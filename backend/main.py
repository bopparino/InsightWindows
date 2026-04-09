from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from core.config import settings
from core.database import engine, Base
from models.models import (  # noqa — registers all models
    Builder, County, Project, EquipmentManufacturer,
    EquipmentSystem, Plan, HouseType, System,
    LineItem, Draw, Document, EventLog, User, Suggestion, CompanySettings,
    PlanComment, PlanTask, KitVariant,
)
from api.routes import plans, equipment, builders, projects, documents, kit, auth, files, search, feedback, company

# Optional integrations — only activated when env vars are present
_ENTRA_ENABLED = all(os.getenv(k) for k in ["AZURE_TENANT_ID", "AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET"])
_SF_ENABLED    = all(os.getenv(k) for k in ["SF_USERNAME", "SF_PASSWORD"])
if _ENTRA_ENABLED:
    from integrations.entra import router as entra_router
if _SF_ENABLED:
    from integrations.salesforce import sf_router

# Create tables on startup if they don't exist
Base.metadata.create_all(bind=engine)

# Run additive column migrations (safe/idempotent — won't touch existing data)
def _run_migrations():
    migrations = [
        # v1.2 — plan templates
        "ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT FALSE",
        # v1.2 — quote versioning
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1",
        # v1.4 — plan comments
        """CREATE TABLE IF NOT EXISTS plan_comments (
            id         SERIAL PRIMARY KEY,
            plan_id    INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
            username   VARCHAR(50) NOT NULL,
            full_name  VARCHAR(100) NOT NULL,
            body       TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT now()
        )""",
        "CREATE INDEX IF NOT EXISTS ix_plan_comments_plan_id ON plan_comments(plan_id)",
        # v1.4 — plan tasks
        """CREATE TABLE IF NOT EXISTS plan_tasks (
            id          SERIAL PRIMARY KEY,
            plan_id     INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
            title       VARCHAR(200) NOT NULL,
            done        BOOLEAN NOT NULL DEFAULT FALSE,
            assigned_to VARCHAR(100),
            created_by  VARCHAR(100) NOT NULL,
            created_at  TIMESTAMP DEFAULT now()
        )""",
        "CREATE INDEX IF NOT EXISTS ix_plan_tasks_plan_id ON plan_tasks(plan_id)",
        # Fix default company name if it was seeded with the placeholder
        "UPDATE company_settings SET company_name = 'Metcalfe Heating & Air Conditioning' WHERE company_name = 'Insight HVAC'",
        "UPDATE company_settings SET company_name = 'Metcalfe Heating & Air Conditioning' WHERE company_name = 'Metcalfe HVAC'",
        # v1.5 — kit variants
        """CREATE TABLE IF NOT EXISTS kit_variants (
            id            SERIAL PRIMARY KEY,
            category_code VARCHAR(4)   NOT NULL,
            category_name VARCHAR(100) NOT NULL,
            variant_code  VARCHAR(40)  NOT NULL,
            variant_name  VARCHAR(200) NOT NULL,
            per_kit       NUMERIC(10,4) NOT NULL DEFAULT 0,
            per_foot      NUMERIC(10,4) NOT NULL DEFAULT 0,
            sort_order    INTEGER NOT NULL DEFAULT 10,
            active        BOOLEAN NOT NULL DEFAULT TRUE
        )""",
        "CREATE INDEX IF NOT EXISTS ix_kit_variants_category ON kit_variants(category_code)",
        # v1.6 — markup divisor (selling = per_kit; internal cost = per_kit * markup_divisor)
        "ALTER TABLE kit_variants ADD COLUMN IF NOT EXISTS markup_divisor NUMERIC(5,4) NOT NULL DEFAULT 1.0",
        # v2.0 — structured bidsheet: factor on plan, labor/service/permit/tax on system
        "ALTER TABLE plans   ADD COLUMN IF NOT EXISTS factor        NUMERIC(5,4) NOT NULL DEFAULT 0.69",
        "ALTER TABLE systems ADD COLUMN IF NOT EXISTS labor_hrs     NUMERIC(6,2) NOT NULL DEFAULT 0",
        "ALTER TABLE systems ADD COLUMN IF NOT EXISTS service_qty   INTEGER      NOT NULL DEFAULT 0",
        "ALTER TABLE systems ADD COLUMN IF NOT EXISTS permit_yn     BOOLEAN      NOT NULL DEFAULT FALSE",
        "ALTER TABLE systems ADD COLUMN IF NOT EXISTS sales_tax_pct NUMERIC(5,4) NOT NULL DEFAULT 0.06",
        # v2.1 — scope of work (includes / excludes) on plan
        "ALTER TABLE plans ADD COLUMN IF NOT EXISTS includes TEXT",
        "ALTER TABLE plans ADD COLUMN IF NOT EXISTS excludes TEXT",
        # v2.2 — kit component templates
        """CREATE TABLE IF NOT EXISTS kit_components (
            id             SERIAL PRIMARY KEY,
            kit_variant_id INTEGER NOT NULL REFERENCES kit_variants(id) ON DELETE CASCADE,
            sort_order     INTEGER NOT NULL DEFAULT 10,
            description    VARCHAR(200) NOT NULL,
            part_number    VARCHAR(60),
            quantity       NUMERIC(8,3) NOT NULL DEFAULT 1,
            unit_cost      NUMERIC(10,4) NOT NULL DEFAULT 0
        )""",
        "CREATE INDEX IF NOT EXISTS ix_kit_components_variant ON kit_components(kit_variant_id)",
        # v2.2 — kit variant back-ref on line items
        "ALTER TABLE line_items ADD COLUMN IF NOT EXISTS kit_variant_id INTEGER REFERENCES kit_variants(id)",
        # v2.2 — snapshotted components per bid line item
        """CREATE TABLE IF NOT EXISTS line_item_components (
            id               SERIAL PRIMARY KEY,
            line_item_id     INTEGER NOT NULL REFERENCES line_items(id) ON DELETE CASCADE,
            kit_component_id INTEGER REFERENCES kit_components(id) ON DELETE SET NULL,
            sort_order       INTEGER NOT NULL DEFAULT 10,
            description      VARCHAR(200) NOT NULL,
            part_number      VARCHAR(60),
            quantity         NUMERIC(8,3) NOT NULL DEFAULT 1,
            unit_cost        NUMERIC(10,4) NOT NULL DEFAULT 0,
            excluded         BOOLEAN NOT NULL DEFAULT FALSE
        )""",
        "CREATE INDEX IF NOT EXISTS ix_line_item_components_li ON line_item_components(line_item_id)",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            conn.execute(__import__("sqlalchemy").text(sql))
        conn.commit()

_run_migrations()

# Ensure storage folder exists
os.makedirs(settings.STORAGE_PATH, exist_ok=True)

# Seed admin user if ADMIN_PASSWORD env var is set or no admin exists
def _seed_admin():
    from core.database import SessionLocal
    from core.security import hash_password
    db = SessionLocal()
    try:
        admin = db.query(User).filter_by(username="admin").first()
        env_pw = os.getenv("ADMIN_PASSWORD")
        if not admin:
            db.add(User(
                username="admin", full_name="Administrator", initials="AD",
                email="admin@insight.local",
                hashed_password=hash_password(env_pw or "ChangeMe123!"),
                role="admin", active=True,
            ))
            db.commit()
        elif env_pw:
            admin.hashed_password = hash_password(env_pw)
            db.commit()
    finally:
        db.close()

_seed_admin()

def _seed_kit_variants():
    """
    Upsert 2019 master price kit variants on every startup.
    Inserts missing rows; updates per_kit/per_foot/name on existing rows
    so prices are always correct even after a re-deploy.
    Source: MASTER PRICES New 2019.xls, Section P fixed chart.
    """
    from core.database import SessionLocal
    db = SessionLocal()
    try:
        # (category_code, category_name, variant_code, variant_name, per_kit, per_foot, sort_order)
        VARIANTS = [
            # ── A: Sheet Metal Runs (per-foot pricing) ───────────────
            ("A","Sheet Metal Runs",'4" SMR', '4" Sheet Metal Run (10 ft)',  19.34, 1.04, 10),
            ("A","Sheet Metal Runs",'5" SMR', '5" Sheet Metal Run (13 ft)',  19.86, 1.40, 20),
            ("A","Sheet Metal Runs",'6" SMR', '6" Sheet Metal Run (13 ft)',  18.64, 1.41, 30),
            ("A","Sheet Metal Runs",'7" SMR', '7" Sheet Metal Run (13 ft)',  23.85, 1.85, 40),
            ("A","Sheet Metal Runs",'8" SMR', '8" Sheet Metal Run (5 ft)',   31.58, 2.08, 50),
            # ── B: Ductboard Runs R8 (per-foot pricing) ──────────────
            ("B","Ductboard Runs (R8)",'4" DBR', '4" Ductboard Run R8',  38.25, 1.57, 10),
            ("B","Ductboard Runs (R8)",'5" DBR', '5" Ductboard Run R8',  41.94, 1.72, 20),
            ("B","Ductboard Runs (R8)",'6" DBR', '6" Ductboard Run R8',  44.06, 1.83, 30),
            ("B","Ductboard Runs (R8)",'7" DBR', '7" Ductboard Run R8',  48.50, 2.02, 40),
            ("B","Ductboard Runs (R8)",'8" DBR', '8" Ductboard Run R8',  54.31, 2.25, 50),
            # ── C: Exhaust Runs (PVC dual pipe — Section P) ──────────
            ("C","Exhaust Runs","PVC2X21DP", '2" PVC Dual Pipe \u00d7 21\' thru Roof', 171.09, 0, 10),
            ("C","Exhaust Runs","PVC2X31DP", '2" PVC Dual Pipe \u00d7 31\' thru Roof', 183.13, 0, 20),
            ("C","Exhaust Runs","PVC2X41DP", '2" PVC Dual Pipe \u00d7 41\' thru Roof', 196.96, 0, 30),
            ("C","Exhaust Runs","PVC3X21DP", '3" PVC Dual Pipe \u00d7 21\' thru Roof', 226.70, 0, 40),
            ("C","Exhaust Runs","PVC3X31DP", '3" PVC Dual Pipe \u00d7 31\' thru Roof', 255.57, 0, 50),
            ("C","Exhaust Runs","PVC3X41DP", '3" PVC Dual Pipe \u00d7 41\' thru Roof', 289.44, 0, 60),
            # ── D: Class B Flues (per ft — Section P) ────────────────
            ("D","Class B Flues",'4" B-VENT', '4" Class B Flue (per ft)',   9.83, 0, 10),
            ("D","Class B Flues",'5" B-VENT', '5" Class B Flue (per ft)',  11.78, 0, 20),
            ("D","Class B Flues",'6" B-VENT', '6" Class B Flue (per ft)',  19.54, 0, 30),
            # ── E: B Vent Connectors (miscl chart 01-04) ─────────────
            ("E","B Vent Connectors","CONN-1", '4" B Vent Connector \u2014 Townhouse Furnace',     121.08, 0, 10),
            ("E","B Vent Connectors","CONN-2", '4" B Vent Connector \u2014 Townhouse HWH',         129.88, 0, 20),
            ("E","B Vent Connectors","CONN-3", '4" B Vent Connector \u2014 Single Family Furnace', 130.71, 0, 30),
            ("E","B Vent Connectors","CONN-4", '4" B Vent Connector \u2014 Single Family HWH',     183.45, 0, 40),
            # ── F: Combustion Air ─────────────────────────────────────
            ("F","Combustion Air","COMB-AIR", "Combustion Air Kit", 85.00, 0, 10),
            # ── G: PVC Flues (refrigerant lines per ft — Section P) ──
            ("G","PVC Flues","REF-LINES",    "Refrigerant Lines \u2014 copper (per ft)",         5.23, 0, 10),
            ("G","PVC Flues","REF-LINES-118","Refrigerant Lines \u2014 1-1/8\" copper (per ft)", 12.65, 0, 20),
            # ── H: Condensate Drain (Section P: CDA=$39.11, CDB=$11.68)
            ("H","Condensate Drain","CDA", "Condensate Drain \u2014 Attic (A)",    39.11, 0, 10),
            ("H","Condensate Drain","CDB", "Condensate Drain \u2014 Basement (B)", 11.68, 0, 20),
            # ── I: Condensate Pump (Section P item 11A: $139.03) ─────
            ("I","Condensate Pump","COND-PUMP", "Condensate Pump \u2014 CP1 (full assembly)", 139.03, 0, 10),
            # ── J: Control Wiring (Section P: $46.76) ────────────────
            ("J","Control Wiring","CTRL-WIRE", "Control Wiring 20/10", 46.76, 0, 10),
            # ── K: Copper Line Sets ───────────────────────────────────
            ("K","Copper Line Sets","LS-25", "Line Set 25 ft (3/8 x 3/4)",  130.83, 0, 10),
            ("K","Copper Line Sets","LS-35", "Line Set 35 ft (3/8 x 3/4)",  183.16, 0, 20),
            ("K","Copper Line Sets","LS-50", "Line Set 50 ft (3/8 x 3/4)",  261.65, 0, 30),
            # ── L: Equipment Mounting Kits (miscl chart 05-07) ───────
            ("L","Equipment Mounting Kits","EMKV-1", "EQ Mounting Kit Vertical 31\u00d731",  52.07, 0, 10),
            ("L","Equipment Mounting Kits","EMKV-2", "EQ Mounting Kit Vertical 31\u00d736",  53.59, 0, 20),
            ("L","Equipment Mounting Kits","EMKH",   "EQ Mounting Kit Horizontal 31\u00d760", 61.85, 0, 30),
            # ── M: Humidifiers (Section P items 10-11 + additional) ─────
            ("M","Humidifiers","HUM-BYPASS", "Aprilaire Model 600 Humidifier",      312.22, 0, 10),
            ("M","Humidifiers","HUM-POWER",  "Aprilaire Model 700 Humidifier",      424.22, 0, 20),
            ("M","Humidifiers","AA400M",     "Aprilaire Model 400M Humidifier",     260.82, 0, 30),
            ("M","Humidifiers","AA800",      "Aprilaire Model 800 Humidifier",      891.15, 0, 40),
            ("M","Humidifiers","HE200A1000", "Honeywell HE200A1000 Humidifier",     128.10, 0, 50),
            ("M","Humidifiers","HE300A1005", "Honeywell HE300A1005 Humidifier",     200.67, 0, 60),
            ("M","Humidifiers","HM612A1000", "Honeywell HM612A1000 Humidifier",    1187.44, 0, 70),
            # ── N: Air Cleaners (Section P items 12-17 + additional) ────
            ("N","Air Cleaners","AC-HE1400",   "Trion Electronic HE1400 16x25",        956.36, 0,  10),
            ("N","Air Cleaners","AC-HE2000",   "Trion Electronic HE2000 20x25",        979.68, 0,  20),
            ("N","Air Cleaners","AC-HF100-16", "HYW Media HF100F2002 16x25",           161.10, 0,  30),
            ("N","Air Cleaners","AC-HF100-20", "HYW Media HF100F2010 20x25",           161.10, 0,  40),
            ("N","Air Cleaners","AC-LX16",     "Lennox Media HCC16-28 w/HCXF16 MERV", 400.00, 0,  50),
            ("N","Air Cleaners","AC-LX20",     "Lennox Media HCC20-28 w/HCXF20 MERV", 550.00, 0,  60),
            ("N","Air Cleaners","AC-HF300-16", "HYW Electronic HF300E1019 16x25",    1027.55, 0,  70),
            ("N","Air Cleaners","AC-HF300-20", "HYW Electronic HF300E1035 20x25",    1122.96, 0,  80),
            ("N","Air Cleaners","AC-TAB16",    "Trion Air Bear Media 16x25",           104.74, 0,  90),
            ("N","Air Cleaners","AC-TAB20",    "Trion Air Bear Media 20x25",           104.74, 0, 100),
            ("N","Air Cleaners","AC-R5000",    "Aprilaire R5000 HEPA 15x25",           703.35, 0, 110),
            # ── O: Energy Recovery Ventilator (Section P item 18 + additional) ─
            ("O","Energy Recovery Ventilator","ERV",        "HYW ERV ER200",                           2351.45, 0, 10),
            ("O","Energy Recovery Ventilator","AA-8145",    "Aprilaire Ventilation System Model 8145",   339.75, 0, 20),
            ("O","Energy Recovery Ventilator","HRV200",     "Broan HRV200 Heat Recovery Ventilator",    1658.00, 0, 30),
            ("O","Energy Recovery Ventilator","ERV150",     "Broan ERV150 Energy Recovery Ventilator",  1252.00, 0, 40),
            ("O","Energy Recovery Ventilator","ERV-BROAN",  "Broan ERV Energy Recovery Ventilator",     1043.00, 0, 50),
            ("O","Energy Recovery Ventilator","ERV-CARRIER","Carrier ERV Energy Recovery Ventilator",   3284.00, 0, 60),
            # ── P: Duct Sealing (Section P item 19: $125.65) ─────────
            ("P","Duct Sealing","MASTIC-PKG", "Mastic Duct Sealing Package", 125.65, 0, 10),
            # ── Q: Laundry Chutes (Section P items 20-21) ────────────
            ("Q","Laundry Chutes","LC1S", "Laundry Chute 10x10 \u2014 One Story", 580.05, 0, 10),
            ("Q","Laundry Chutes","LC2S", "Laundry Chute 10x10 \u2014 Two Story", 759.22, 0, 20),
            # ── R: Fresh-Air ─────────────────────────────────────────
            ("R","Fresh-Air","CONCENTRIC", "Concentric Termination Kit",                39.60, 0, 10),
            ("R","Fresh-Air","CN2220",     "Condensate Neutralizer CN2-220",            62.10, 0, 20),
            ("R","Fresh-Air","AA-8142",    "Aprilaire 8142 Fresh Air Ventilator",      275.58, 0, 30),
            ("R","Fresh-Air","FIN-180B",   "Field Controls FIN-180B Fresh Air Damper", 215.95, 0, 40),
            ("R","Fresh-Air","FIN-180P",   "Field Controls FIN-180P Fresh Air Damper", 281.07, 0, 50),
            ("R","Fresh-Air","Y4010-8",    'Honeywell Y4010 Fresh Air Damper 8"',      165.00, 0, 60),
            ("R","Fresh-Air","Y4010-10",   'Honeywell Y4010 Fresh Air Damper 10"',     176.00, 0, 70),
            ("R","Fresh-Air","PS1503",     "Field Controls PS1503 Power Open Damper",   66.44, 0, 80),
            ("R","Fresh-Air","MAS-1",      "MAS-1 Make-Up Air System",                 102.02, 0, 90),
            # ── S: Transfer Grill (Section P: RETURN GRILL = $19.54) ─
            ("S","Transfer Grill","RET-GRILL", "Return / Transfer Grill", 19.54, 0, 10),
            # ── T: Zone Control Dampers (Section P items 22-25A) ─────
            ("T","Zone Control Dampers","APR-2Z",        "Aprilaire 6202 \u2014 2 Zone / 2 Dampers",         890.84, 0, 10),
            ("T","Zone Control Dampers","APR-3Z",        "Aprilaire 6203 \u2014 3 Zone / 3 Dampers",        1305.31, 0, 20),
            ("T","Zone Control Dampers","APR-3Z-HP",     "Aprilaire 6303 \u2014 2-3 Zone / 3 Dampers (HP)", 1365.22, 0, 30),
            ("T","Zone Control Dampers","APR-4Z",        "Aprilaire 6404 \u2014 4 Zone / 4 Dampers",        1743.12, 0, 40),
            ("T","Zone Control Dampers","CARRIER-INF-4Z","Carrier Infinity 4-Zone System",                  3713.13, 0, 50),
            ("T","Zone Control Dampers","EWC-2Z",        "EWC Model 3000-2 \u2014 2 Zone / 2 Dampers",      1503.49, 0, 60),
            ("T","Zone Control Dampers","EWC-3Z",        "EWC Model 3000-3 \u2014 3 Zone / 3 Dampers",      2077.46, 0, 70),
            ("T","Zone Control Dampers","EWC-4Z",        "EWC Model 5000-4 \u2014 4 Zone / 4 Dampers",      2664.17, 0, 80),
            # ── U: Misc. Accessories (Section P items 26-29A) ────────
            ("U","Misc. Accessories","TXV",      "TXV Valve",                              126.00, 0, 10),
            ("U","Misc. Accessories","LPK",      "LP Kit",                                 128.00, 0, 20),
            ("U","Misc. Accessories","SYW",      "Second Year Warranty",                   130.00, 0, 30),
            ("U","Misc. Accessories","AK-14",    'IPG Air Knight 14"',                     887.00, 0, 40),
            ("U","Misc. Accessories","AK-7",     'IPG Air Knight 7"',                      912.00, 0, 50),
            ("U","Misc. Accessories","R454B",    "R-454B Refrigerant Surcharge",            42.90, 0, 60),
            ("U","Misc. Accessories","FR-16X25", "Filter Rack 16x25 w/Filter",              16.62, 0, 70),
            ("U","Misc. Accessories","FR-20X25", "Filter Rack 20x25 w/Filter",              16.80, 0, 80),
            ("U","Misc. Accessories","SLABS",    "Polytex A/C Pads + Pump-Ups + Locking Caps",  42.52, 0,  90),
            ("U","Misc. Accessories","WALLBRKT", 'Wall Brackets (36")',                        134.81, 0, 100),
            ("U","Misc. Accessories","PERMIT",   "Building Permit",                            170.00, 0, 110),
            ("U","Misc. Accessories","HUV100",   "Honeywell UV100E1043 UV Lamp",               715.00, 0, 120),
            # ── V: Exhaust Fans (Section L — bath/exhaust fans) ───────
            ("V","Exhaust Fans","FAN-688",       "NuTone 688 Exhaust Fan",                      18.85, 0,  10),
            ("V","Exhaust Fans","FAN-AE80B",     "Broan AE80B Exhaust Fan",                     57.12, 0,  20),
            ("V","Exhaust Fans","FAN-AE80",      "Broan AE80 Exhaust Fan",                     164.80, 0,  30),
            ("V","Exhaust Fans","FAN-744LED",    "Broan 744LED Exhaust Fan w/Light",           148.00, 0,  40),
            ("V","Exhaust Fans","FAN-SLM70",     "Broan SLM70 Ultra-Silent Fan",                46.67, 0,  50),
            ("V","Exhaust Fans","FAN-SIG80",     "Broan SIG80-110D Exhaust Fan",               160.18, 0,  60),
            ("V","Exhaust Fans","FAN-BFQ80",     "Broan BFQ80 Exhaust Fan",                     50.61, 0,  70),
            ("V","Exhaust Fans","FAN-ZB110",     "Broan ZB110 Exhaust Fan",                    164.69, 0,  80),
            ("V","Exhaust Fans","FAN-ZB110L",    "Broan ZB110L Exhaust Fan w/Light",           240.98, 0,  90),
            ("V","Exhaust Fans","FAN-ZB110H",    "Broan ZB110H Exhaust Fan w/Heater",          164.69, 0, 100),
            ("V","Exhaust Fans","FAN-SSQTXE110", "Broan SSQTXE110 Ultra-Silent Fan",           164.69, 0, 110),
            ("V","Exhaust Fans","FAN-QTX110HL",  "Broan QTX110HL Fan w/Light & Heater",        254.05, 0, 120),
            ("V","Exhaust Fans","FAN-503",       "NuTone 503 Exhaust Fan",                     157.50, 0, 130),
            ("V","Exhaust Fans","FAN-PM390",     "Panasonic PM390 Exhaust Fan",                432.00, 0, 140),
            ("V","Exhaust Fans","FAN-FR100",     "Fantech FR100 Inline Fan",                   197.77, 0, 150),
            # ── W: HEPA Filters (Broan HEPA series) ──────────────────
            ("W","HEPA Filters","GSFH1K",    "Broan GSFH1K HEPA Filter System",           1210.00, 0, 10),
            ("W","HEPA Filters","GSVH1K",    "Broan GSVH1K HEPA Filter System",           1540.00, 0, 20),
            ("W","HEPA Filters","GSHH3K",    "Broan GSHH3K HEPA Filter System",           1980.00, 0, 30),
            ("W","HEPA Filters","GSEH3K",    "Broan GSEH3K HEPA Filter System",           2310.00, 0, 40),
            ("W","HEPA Filters","ACCGSFHP2", "Broan ACCGSFHP2 HEPA Replacement Filter",    275.00, 0, 50),
        ]

        # Build lookup of existing records by variant_code for upsert
        existing = {v.variant_code: v for v in db.query(KitVariant).all()}
        added = updated = 0

        for cat_code, cat_name, v_code, v_name, per_kit, per_foot, sort in VARIANTS:
            if v_code in existing:
                row = existing[v_code]
                # Update price and name if changed
                row.category_name = cat_name
                row.variant_name  = v_name
                row.per_kit       = per_kit
                row.per_foot      = per_foot
                row.sort_order    = sort
                updated += 1
            else:
                db.add(KitVariant(
                    category_code=cat_code, category_name=cat_name,
                    variant_code=v_code,   variant_name=v_name,
                    per_kit=per_kit,       per_foot=per_foot,
                    sort_order=sort,       active=True,
                ))
                added += 1

        db.commit()
        if added or updated:
            print(f"Kit variants: {added} added, {updated} updated.")
    finally:
        db.close()

_seed_kit_variants()


def _fix_kit_variants():
    """
    Idempotent corrections to the 2019 kit variant data.
    Safe to run on every startup — UPDATEs are no-ops when already correct,
    INSERTs use WHERE NOT EXISTS to skip duplicates.

    per_kit = bid price (what builder is charged).
    markup_divisor = internal cost as fraction of bid price
        e.g. 0.65 means internal cost = bid_price * 0.65, margin = 35%.
        1.0 means cost ≈ bid price (margin comes from labor efficiency, not per-item markup).
    """
    def ins(cat_code, cat_name, v_code, v_name, per_kit, per_foot, sort, divisor=1.0):
        return f"""INSERT INTO kit_variants
            (category_code,category_name,variant_code,variant_name,per_kit,per_foot,markup_divisor,sort_order,active)
            SELECT '{cat_code}','{cat_name}','{v_code}','{v_name}',{per_kit},{per_foot},{divisor},{sort},TRUE
            WHERE NOT EXISTS (SELECT 1 FROM kit_variants WHERE variant_code='{v_code}')"""

    fixes = [
        # ── Category C: correct labels ────────────────────────────────────────
        "UPDATE kit_variants SET variant_code='DRYER-WALL', variant_name='Dryer Vent to Wall Cap (1st Floor)', sort_order=30 WHERE variant_code='KITCH-EXH'",
        "UPDATE kit_variants SET variant_code='DRYER-ROOF', variant_name='Dryer Vent thru Roof (2nd Floor)',  sort_order=40 WHERE variant_code='DRYER-VENT'",
        # Missing range/kitchen exhaust variants (material-only cost, markup_divisor=1.0)
        ins('C','Exhaust Runs','RANGE-ROOF', 'Range Exhaust thru Roof 6"',       87.41,  0, 50),
        ins('C','Exhaust Runs','RANGE-WALL', 'Range Exhaust to Wall Cap 6"',     56.14,  0, 60),
        ins('C','Exhaust Runs','RANGE-DOWN', 'Range Exhaust Downdraft 6"',      102.90,  0, 70),
        ins('C','Exhaust Runs','RANGE-TELE', 'Range Exhaust Telescopic 6"',     136.06,  0, 80),
        ins('C','Exhaust Runs','RANGE-DLUX', 'Range Exhaust Deluxe Updraft 10"',248.73,  0, 90),

        # ── Category D: Class B Flues — per FOOT not per kit ─────────────────
        "UPDATE kit_variants SET per_kit=0, per_foot=9.83  WHERE variant_code='4\" B-VENT'",
        "UPDATE kit_variants SET per_kit=0, per_foot=11.78 WHERE variant_code='5\" B-VENT'",
        "UPDATE kit_variants SET per_kit=0, per_foot=19.54 WHERE variant_code='6\" B-VENT'",

        # ── Category H: rename mis-labeled Attic condensate drain ────────────
        "UPDATE kit_variants SET variant_code='COND-ATTIC', variant_name='Condensate Drain \u2014 Attic Unit (50 ft)' WHERE variant_code='COND-PUMP-UP'",

        # ── Category N: correct air cleaner prices to real model numbers ─────
        "UPDATE kit_variants SET per_kit=161.10,  variant_name='Honeywell HF100F2002 16x25 Media'       WHERE variant_code='AC-1'",
        "UPDATE kit_variants SET per_kit=161.10,  variant_name='Honeywell HF100F2010 20x25 Media'       WHERE variant_code='AC-2'",
        "UPDATE kit_variants SET per_kit=956.36,  variant_name='Trion HE1400 16x25 Electronic'          WHERE variant_code='AC-3'",
        "UPDATE kit_variants SET per_kit=979.68,  variant_name='Trion HE2000 20x25 Electronic'          WHERE variant_code='AC-4'",
        "UPDATE kit_variants SET per_kit=1027.55, variant_name='Honeywell HF300E1019 16x25 Electronic'  WHERE variant_code='AC-5'",
        "UPDATE kit_variants SET per_kit=1122.96, variant_name='Honeywell HF300E1035 20x25 HEPA'        WHERE variant_code='AC-6'",

        # ── Category P: Duct Sealing — selling price = cost / 0.69 ──────────
        # cost=125.65, selling=182.10
        "UPDATE kit_variants SET per_kit=182.10, markup_divisor=0.69 WHERE variant_code='MASTIC-PKG'",

        # ── Category Q: Laundry Chutes — selling price = cost / 0.55 ─────────
        # 1-story cost=319.03 → sell=580.05; 2-story cost=417.57 → sell=759.22
        "UPDATE kit_variants SET per_kit=580.05, markup_divisor=0.55, variant_name='Laundry Chute \u2014 One Story', sort_order=10 WHERE variant_code='LAUNDRY'",
        ins('Q','Laundry Chutes','LAUNDRY-2ST','Laundry Chute \u2014 Two Story', 759.22, 0, 20, 0.55),

        # ── Category R: Fresh-Air — selling price = cost / 0.69 ─────────────
        # costs: FAS-1=278.53 FAS-2=300.00 FAS-3=332.12 FAS-4=392.34 FAS-5=228.70
        "UPDATE kit_variants SET active=FALSE WHERE variant_code='FRESH-AIR'",
        ins('R','Fresh-Air','FAS-1','Aprilaire 8126X to Air Handler',        403.66, 0, 10, 0.69),
        ins('R','Fresh-Air','FAS-2','Broan MD6TU to 14x14 Filter Grill',     434.78, 0, 20, 0.69),
        ins('R','Fresh-Air','FAS-3','Broan MD8TU to 14x14 Filter Grill',     481.33, 0, 30, 0.69),
        ins('R','Fresh-Air','FAS-4','Broan MD10TU to 14x14 Filter Grill',    568.61, 0, 40, 0.69),
        ins('R','Fresh-Air','FAS-5','Honeywell Y8150 to Air Handler',         331.45, 0, 50, 0.69),

        # ── Category S: Transfer Grill — selling price = cost / 0.65 ─────────
        # cost=28.17, selling=43.34
        "UPDATE kit_variants SET per_kit=43.34, markup_divisor=0.65 WHERE variant_code='XFER-GRILL'",

        # ── Category T: fix Aprilaire labels, set markup_divisor=0.65 ────────
        # APR-4Z ($1364.86 cost) is actually the 2-or-3 Zone Heat Pump (AA 6303)
        # APR-5Z ($1742.76 cost) is actually the 4-Zone (AA 6404)
        # selling = cost / 0.65
        "UPDATE kit_variants SET per_kit=1370.52, markup_divisor=0.65 WHERE variant_code='APR-2Z'",
        "UPDATE kit_variants SET per_kit=2007.62, markup_divisor=0.65 WHERE variant_code='APR-3Z'",
        "UPDATE kit_variants SET per_kit=2099.78, markup_divisor=0.65, variant_name='Aprilaire 6303 \u2014 2 or 3 Zone Heat Pump' WHERE variant_code='APR-4Z'",
        "UPDATE kit_variants SET per_kit=2680.86, markup_divisor=0.65, variant_name='Aprilaire 6404 \u2014 4 Zone'               WHERE variant_code='APR-5Z'",
        "UPDATE kit_variants SET per_kit=2313.06, markup_divisor=0.65 WHERE variant_code='EWC-2Z'",
        "UPDATE kit_variants SET per_kit=3195.32, markup_divisor=0.65 WHERE variant_code='EWC-3Z'",
        "UPDATE kit_variants SET per_kit=4098.72, markup_divisor=0.65 WHERE variant_code='EWC-4Z'",

        # ── Category U: Misc. Accessories (filter racks & grills) ────────────
        ins('U','Misc. Accessories','FR-16X25', 'Filter Rack 16x25 (Shop Made)',  16.62, 0, 10),
        ins('U','Misc. Accessories','FR-20X25', 'Filter Rack 20x25 (Shop Made)',  16.80, 0, 20),
        ins('U','Misc. Accessories','FG-14X14', 'Filter Grill 14x14',             10.54, 0, 30),
        ins('U','Misc. Accessories','FG-20X20', 'Filter Grill 20x20',             17.46, 0, 40),
    ]
    with engine.connect() as conn:
        for sql in fixes:
            conn.execute(__import__("sqlalchemy").text(sql))
        conn.commit()

_fix_kit_variants()


def _seed_kit_components():
    """
    Idempotent: inserts KitComponent rows parsed from KIT PRICES new 2019.XLS.
    Skips any variant that already has components — run once per fresh deploy.
    341 components across 30 kits (sheet metal, ductboard, PVC flues,
    condensate pump, humidifiers, air cleaners, mastic, zone dampers).
    """
    from core.database import SessionLocal
    from models.models import KitComponent, KitVariant
    db = SessionLocal()
    try:
        # fmt: (sort_order, description, part_number, quantity, unit_cost)
        COMPONENT_SEED = {
            # 4" SMR
            '4" SMR': [
                (10, 'ROUND PIPE 4"X10\'', '4" RD', 10.0, 0.9397),
                (20, 'ROUND ELL 4" GALV  30 GA', '4" RD ELL', 1.0, 1.3755),
                (30, 'ELL REGISTER BOOT 10X4X4', '10X4X4 ELRB', 1.0, 2.6775),
                (40, 'AIR TITE 4"', '4" AT', 1.0, 2.856),
                (50, 'FLOOR REGISTER', '4X10 FLR', 1.0, 2.5029),
                (60, 'SCREWS (8X3/4 1/4"HEX HEAD)', '8X3/4" HHS', 15.0, 0.0168),
                (70, 'TAPE ALUM FOIL 3"X60 YDS', '3" AFT', 4.0, 0.0703),
            ],
            '5" SMR': [
                (10, 'ROUND PIPE 5"X10\'', '5" RD', 10.0, 0.966),
                (20, 'ROUND ELL 5" GALV  30 GA', '5" RD ELL', 1.0, 1.5645),
                (30, 'ELL REGISTER BOOT 10X4X5', '10X4X5 ELRB', 1.0, 2.6775),
                (40, 'AIR TITE 5"', '5" AT', 1.0, 2.856),
                (50, 'FLOOR REGISTER', '4X10 FLR', 1.0, 2.5029),
                (60, 'SCREWS (8X3/4 1/4"HEX HEAD)', '8X3/4" HHS', 15.0, 0.0168),
                (70, 'TAPE ALUM FOIL 3"X60 YDS', '3" AFT', 5.0, 0.0703),
            ],
            '6" SMR': [
                (10, 'ROUND PIPE 6"X10\'', '6" RD', 10.0, 0.966),
                (20, 'ROUND ELL 6" GALV  30 GA', '6" RD ELL', 2.0, 1.5645),
                (30, 'ELL REGISTER BOOT 10X4X6', '10X4X6 ELRB', 1.0, 2.6775),
                (40, 'FLOOR REGISTER', '4X10 FLR', 1.0, 2.5029),
                (50, 'SCREWS (8X3/4 1/4"HEX HEAD)', '8X3/4" HHS', 15.0, 0.0168),
                (60, 'TAPE ALUM FOIL 3"X60 YDS', '3" AFT', 6.0, 0.0703),
            ],
            '7" SMR': [
                (10, 'ROUND PIPE 7"X10\'', '7" RD', 10.0, 1.2653),
                (20, 'ROUND ELL 7" GALV  30 GA', '7" RD ELL', 2.0, 2.1945),
                (30, 'ELL REGISTER BOOT 12X4X7', '12X4X7 ELRB', 1.0, 2.961),
                (40, 'FLOOR REGISTER', '4X12 FLR', 1.0, 3.1415),
                (50, 'SCREWS (8X3/4 1/4"HEX HEAD)', '8X3/4" HHS', 15.0, 0.0168),
                (60, 'TAPE ALUM FOIL 3"X60 YDS', '3" AFT', 6.5, 0.0703),
            ],
            '8" SMR': [
                (10, 'ROUND PIPE 8"X10\'', '8" RD', 10.0, 1.449),
                (20, 'ROUND ELL 8" GALV  30 GA', '8" RD ELL', 2.0, 2.4255),
                (30, 'ELL REGISTER BOOT 14X4X8', '14X4X8 ELRB', 1.0, 3.864),
                (40, 'AIR TITE 8"', '8" AT', 1.0, 3.528),
                (50, 'FLOOR REGISTER', '4X14 FLR', 1.0, 4.12),
                (60, 'SCREWS (8X3/4 1/4"HEX HEAD)', '8X3/4" HHS', 15.0, 0.0168),
                (70, 'TAPE ALUM FOIL 3"X60 YDS', '3" AFT', 6.75, 0.0703),
            ],
            '4" DBR': [
                (10, 'FLEX DUCT R8 INSULATED 4"X18\'', '4"X18\' Q46518', 1.0, 28.4025),
                (20, 'DUCTBOARD COLLAR 4" (1.5")', '4" DBC', 1.0, 1.1235),
                (30, 'STRAIGHT REGISTER BOOT 10X4X4', '10X4X4 SRB', 1.0, 2.6775),
                (40, 'WALL REGISTER 10X4', '10X4 WR', 1.0, 3.193),
                (50, 'PLASTIC TIES 36"', '36" PT', 2.0, 0.264),
                (60, 'SCREWS (8X3/4 1/4"HEX HEAD)', '8X3/4" HHS', 2.0, 0.0168),
                (70, 'TAPE SEALING UL181B-FX 2"X120 YDS', '2" FXST', 3.0, 0.0599),
                (80, 'SLIP (S) PER FOOT', 'S SLIP', 4.4, 0.4795),
            ],
            '5" DBR': [
                (10, 'FLEX DUCT R8 INSULATED 5"X18\'', '5"X18\' Q56518', 1.0, 30.87),
                (20, 'DUCTBOARD COLLAR 5" (1.5")', '5" DBC', 1.0, 1.302),
                (30, 'STRAIGHT REGISTER BOOT 8X6X5', '8X6X5 SRB', 1.0, 3.423),
                (40, 'WALL REGISTER 8X6', '8X6 WR', 1.0, 3.4917),
                (50, 'PLASTIC TIES 36"', '36" PT', 2.0, 0.264),
                (60, 'SCREWS (8X3/4 1/4"HEX HEAD)', '8X3/4" HHS', 2.0, 0.0168),
                (70, 'TAPE SEALING UL181B-FX 2"X120 YDS', '2" FXST', 3.0, 0.0599),
                (80, 'SLIP (S) PER FOOT', 'S SLIP', 4.4, 0.4795),
            ],
            '6" DBR': [
                (10, 'FLEX DUCT R8 INSULATED 6"X18\'', '6"X18\' Q66518', 1.0, 32.97),
                (20, 'DUCTBOARD COLLAR 6" (1.5")', '6" DBC', 1.0, 1.323),
                (30, 'STRAIGHT REGISTER BOOT 10X6X6', '10X6X6 SRB', 1.0, 3.36),
                (40, 'WALL REGISTER 10X6', '10X6 WR', 1.0, 3.4917),
                (50, 'PLASTIC TIES 36"', '36" PT', 2.0, 0.264),
                (60, 'SCREWS (8X3/4 1/4"HEX HEAD)', '8X3/4" HHS', 2.0, 0.0168),
                (70, 'TAPE SEALING UL181B-FX 2"X120 YDS', '2" FXST', 4.0, 0.0599),
                (80, 'SLIP (S) PER FOOT', 'S SLIP', 4.4, 0.4795),
            ],
            '7" DBR': [
                (10, 'FLEX DUCT R8 INSULATED 7"X18\'', '7"X18\' Q76518', 1.0, 36.2775),
                (20, 'DUCTBOARD COLLAR 7" (1.5")', '7" DBC', 1.0, 1.5645),
                (30, 'STRAIGHT REGISTER BOOT 12X6X7', '12X6X7 SRB', 1.0, 3.6645),
                (40, 'WALL REGISTER 12X6', '12X6 WR', 1.0, 4.0788),
                (50, 'PLASTIC TIES 36"', '36" PT', 2.0, 0.264),
                (60, 'SCREWS (8X3/4 1/4"HEX HEAD)', '8X3/4" HHS', 2.0, 0.0168),
                (70, 'TAPE SEALING UL181B-FX 2"X120 YDS', '2" FXST', 4.0, 0.0599),
                (80, 'SLIP (S) PER FOOT', 'S SLIP', 4.4, 0.4795),
            ],
            '8" DBR': [
                (10, 'FLEX DUCT R8 INSULATED 8"X18\'', '8"X18\' Q86518', 1.0, 40.425),
                (20, 'DUCTBOARD COLLAR 8" (1.5")', '8" DBC', 1.0, 1.7955),
                (30, 'STRAIGHT REGISTER BOOT 12X8X8', '12X8X8 SRB', 1.0, 4.158),
                (40, 'WALL REGISTER 12X8', '12X8 WR', 1.0, 5.0161),
                (50, 'PLASTIC TIES 36"', '36" PT', 2.0, 0.264),
                (60, 'SCREWS (8X3/4 1/4"HEX HEAD)', '8X3/4" HHS', 2.0, 0.0168),
                (70, 'TAPE SEALING UL181B-FX 2"X120 YDS', '2" FXST', 4.0, 0.0599),
                (80, 'SLIP (S) PER FOOT', 'S SLIP', 4.4, 0.4795),
            ],
            'PVC2X21DP': [
                (10, 'PVC 2"X20\' Schedule 40 Solid Core', '2"X20\' PVCFC', 45.0, 0.1728),
                (20, 'PVC 2" Long Coupling', '2" COUP', 4.0, 1.2544),
                (30, 'PVC 2" 90 Deg Long Sweep Ell', '2" 90 LS PVC', 7.0, 2.6992),
                (40, 'Plumber Strap 3/4" Plastic', '3/4" PS', 17.25, 0.0965),
                (50, 'PVC Roof Flashing 3"', '3" F PVC', 2.0, 2.53),
                (60, 'Armaflex 2"X6\'', '2"X6\' AFLEX', 8.0, 2.0808),
                (70, 'Installation Labor', 'INSTLC', 1.27, 66.32),
            ],
            'PVC2X31DP': [
                (10, 'PVC 2"X20\' Schedule 40 Solid Core', '2"X20\' PVCFC', 65.0, 0.1728),
                (20, 'PVC 2" Long Coupling', '2" COUP', 6.0, 1.2544),
                (30, 'PVC 2" 90 Deg Long Sweep Ell', '2" 90 LS PVC', 9.0, 2.6992),
                (40, 'Plumber Strap 3/4" Plastic', '3/4" PS', 23.0, 0.0965),
                (50, 'PVC Roof Flashing 3"', '3" F PVC', 2.0, 2.53),
                (60, 'Armaflex 2"X6\'', '2"X6\' AFLEX', 8.0, 2.0808),
                (70, 'Installation Labor', 'INSTLC', 1.27, 66.32),
            ],
            'PVC2X41DP': [
                (10, 'PVC 2"X20\' Schedule 40 Solid Core', '2"X20\' PVCFC', 85.0, 0.1728),
                (20, 'PVC 2" Long Coupling', '2" COUP', 9.0, 1.2544),
                (30, 'PVC 2" 90 Deg Long Sweep Ell', '2" 90 LS PVC', 11.0, 2.6992),
                (40, 'Plumber Strap 3/4" Plastic', '3/4" PS', 34.25, 0.0965),
                (50, 'PVC Roof Flashing 3"', '3" F PVC', 2.0, 2.53),
                (60, 'Armaflex 2"X6\'', '2"X6\' AFLEX', 8.0, 2.0808),
                (70, 'Installation Labor', 'INSTLC', 1.27, 66.32),
            ],
            'PVC3X21DP': [
                (10, 'PVC 3"X20\' Schedule 40 Solid Core', '3"X20\' PVCFC', 45.0, 0.3413),
                (20, 'PVC 3" Long Coupling', '3" COUP', 4.0, 4.1796),
                (30, 'PVC 3" 90 Deg Long Sweep Ell', '3" 90 LS PVC', 7.0, 6.0048),
                (40, 'Plumber Strap 3/4" Plastic', '3/4" PS', 20.75, 0.0965),
                (50, 'PVC Roof Flashing 4"', '4" F PVC', 2.0, 3.5616),
                (60, 'Armaflex 3"X6\'', '3"X6\' AFLEX', 8.0, 3.2083),
                (70, 'Installation Labor', 'INSTLC', 1.27, 66.32),
            ],
            'PVC3X31DP': [
                (10, 'PVC 3"X20\' Schedule 40 Solid Core', '3"X20\' PVCFC', 65.0, 0.3413),
                (20, 'PVC 3" Long Coupling', '3" COUP', 6.0, 4.1796),
                (30, 'PVC 3" 90 Deg Long Sweep Ell', '3" 90 LS PVC', 9.0, 6.0048),
                (40, 'Plumber Strap 3/4" Plastic', '3/4" PS', 27.7, 0.0965),
                (50, 'PVC Roof Flashing 4"', '4" F PVC', 2.0, 3.5616),
                (60, 'Armaflex 3"X6\'', '3"X6\' AFLEX', 8.0, 3.2083),
                (70, 'Installation Labor', 'INSTLC', 1.27, 66.32),
            ],
            'PVC3X41DP': [
                (10, 'PVC 3"X20\' Schedule 40 Solid Core', '3"X20\' PVCFC', 85.0, 0.3413),
                (20, 'PVC 3" Long Coupling', '3" COUP', 9.0, 4.1796),
                (30, 'PVC 3" 90 Deg Long Sweep Ell', '3" 90 LS PVC', 11.0, 6.0048),
                (40, 'Plumber Strap 3/4" Plastic', '3/4" PS', 41.5, 0.0965),
                (50, 'PVC Roof Flashing 4"', '4" F PVC', 2.0, 3.5616),
                (60, 'Armaflex 3"X6\'', '3"X6\' AFLEX', 8.0, 3.2083),
                (70, 'Installation Labor', 'INSTLC', 1.27, 66.32),
                (80, 'PVC 3/4"X10\' Schedule 40', '3/4"X10\' PVC', 10.0, 0.3119),
                (90, 'PVC 3/4" Coupling', '3/4" COUP PVC', 2.0, 0.319),
                (100, 'PVC 3/4" Male Adapter', '3/4" MA PVC', 1.0, 0.363),
                (110, 'PVC 3/4" Plug', '3/4" PLUG PVC', 1.0, 1.012),
                (120, 'PVC 3/4" 45 Ell', '3/4" 45 PVC', 2.0, 0.913),
                (130, 'PVC 3/4" 90 Ell', '3/4" 90 PVC', 4.0, 0.396),
                (140, 'PVC 3/4" Trap', '3/4" TRAP PVC', 2.0, 1.419),
                (150, 'EMT Strap 1"', '1" EMTS', 5.0, 0.2916),
                (160, 'Screws (8X3/4 1/4"HEX HEAD)', '8X3/4" HHS', 5.0, 0.0168),
            ],
            'COND-PUMP': [
                (10, 'Condensate Pump Little Giant #VCM15ULS', 'LITTLE GIANT CP', 1.0, 63.58),
                (20, 'Vinyl Tubing 1/2"X100\'', '1/2"X100\' VT', 50.0, 0.0863),
                (30, 'Thermostat Wire 20X5 20 GA 250\'', '20X5TW', 10.0, 0.2913),
                (40, 'Wire Nuts 72B', '72B BLUE', 4.0, 0.341),
                (50, 'Plastic Ties 8"', '8" PT', 12.0, 0.0452),
                (60, 'Installation Labor', 'INSTLC', 1.0, 66.32),
            ],
            'HUM-BYPASS': [
                (10, 'Humidifier Aprilaire #600M', 'AA600M', 1.0, 159.033),
                (20, 'Flex Alum Foil Connector 6"X7\'', '6"X7\' FC', 1.0, 4.116),
                (30, 'Round Ell 6" Galv 30 GA', '6" RD ELL', 1.0, 1.5645),
                (40, 'Plastic Ties 36"', '36" PT', 2.0, 0.264),
                (50, 'Copper Tubing Soft 1/4"X50\'', '1/4"X50\' SCT', 10.0, 0.8574),
                (60, 'Vinyl Tubing 1/2"X100\'', '1/2"X100\' VT', 1.0, 0.0863),
                (70, 'Thermostat Wire 20X5 20 GA 250\'', '20X5TW', 5.0, 0.2913),
                (80, 'Wire Nuts 72B', '72B BLUE', 2.0, 0.341),
                (90, 'PVC 3/4"X10\' Schedule 40', '3/4"X10\' PVC', 5.0, 0.3119),
                (100, 'PVC 3/4" Tee', '3/4" TEE PVC', 1.0, 0.517),
                (110, 'PVC 3/4" 90 Ell', '3/4" 90 PVC', 2.0, 0.396),
                (120, 'EMT Strap 1"', '1" EMTS', 2.0, 0.2916),
                (130, 'Screws (8X3/4 1/4"HEX HEAD)', '8X3/4" HHS', 12.0, 0.0168),
                (140, 'Service Labor', 'SLC', 2.0, 66.32),
            ],
            'HUM-POWER': [
                (10, 'Humidifier Aprilaire #700M', 'AA700M', 1.0, 277.1265),
                (20, 'Copper Tubing Soft 1/4"X50\'', '1/4"X50\' SCT', 10.0, 0.8574),
                (30, 'Vinyl Tubing 1/2"X100\'', '1/2"X100\' VT', 1.0, 0.0863),
                (40, 'Thermostat Wire 20X5 20 GA 250\'', '20X5TW', 5.0, 0.2913),
                (50, 'Wire Nuts 72B', '72B BLUE', 2.0, 0.341),
                (60, 'PVC 3/4"X10\' Schedule 40', '3/4"X10\' PVC', 5.0, 0.3119),
                (70, 'PVC 3/4" Tee', '3/4" TEE PVC', 1.0, 0.517),
                (80, 'PVC 3/4" 90 Ell', '3/4" 90 PVC', 2.0, 0.396),
                (90, 'EMT Strap 1"', '1" EMTS', 2.0, 0.2916),
                (100, 'Screws (8X3/4 1/4"HEX HEAD)', '8X3/4" HHS', 12.0, 0.0168),
                (110, 'Service Labor', 'SLC', 2.0, 66.32),
            ],
            'AC-HE2000': [
                (10, 'Air Cleaner Trion HE2000 20X25', '20X25 HE2000', 1.0, 714.395),
                (20, 'Service Labor', 'SLC', 4.0, 66.32),
            ],
            'AC-HF300-16': [
                (10, 'Air Cleaner Honeywell HF300E1019 16X25', '16X25 HF300', 1.0, 762.267),
                (20, 'Service Labor', 'SLC', 4.0, 66.32),
            ],
            'AC-HF300-20': [
                (10, 'Air Cleaner Honeywell HF300E1035 20X25', '20X25 HF300', 1.0, 857.681),
                (20, 'Service Labor', 'SLC', 4.0, 66.32),
            ],
            'MASTIC-PKG': [
                (10, 'Duct Seal Mastic (Carlisle Versa-Grip 181)', '181 DSM', 1.0, 12.312),
                (20, 'Duct Seal Mastic Brush (Throw-Away)', 'DSMB', 2.0, 0.81),
                (30, 'Foil Mastic Tape 3"X100\'', 'HAR304094', 200.0, 0.3261),
                (40, 'Shop Labor', 'SHLC', 1.0, 28.49),
                (50, 'Sheet Metal Labor', 'SMLC', 1.0, 18.0),
            ],
            'APR-2Z': [
                (10, 'Aprilaire Damper Control Panel AA6202 (2-Zone)', 'AA6202', 1.0, 73.059),
                (20, 'Thermostat Braeburn #1020NC', 'O-8444', 1.0, 46.44),
                (30, 'Damper Side Mount 12X10 AA6733', '12X10SMDAA6733', 2.0, 73.1955),
                (40, 'Damper Bypass Round 12" AA6112', '12BPDAA6112', 1.0, 74.1405),
                (50, 'Thermostat Wire 18X8 18 GA 250\'', '18X8TW', 75.0, 0.4499),
                (60, '12" Bypass Flex & Fittings', '12X10D', 1.0, 71.37),
                (70, '40 VA Transformer', '40VAT', 1.0, 14.616),
                (80, 'Sheet Metal Labor', 'SMLC', 1.0, 66.32),
                (90, 'Installation Labor', 'INSTLC', 1.0, 66.32),
                (100, 'Service Labor', 'SLC', 3.0, 66.32),
                (110, 'One Year Service', 'OYSC', 1.5, 66.32),
            ],
            'APR-3Z': [
                (10, 'Aprilaire Damper Control Panel AA6203 (3-Zone)', 'AA6203', 1.0, 79.758),
                (20, 'Thermostat Braeburn #1020NC', 'O-8444', 2.0, 46.44),
                (30, 'Damper Side Mount 12X10 AA6733', '12X10SMDAA6733', 3.0, 73.1955),
                (40, 'Damper Bypass Round 12" AA6112', '12BPDAA6112', 1.0, 74.1405),
                (50, 'Thermostat Wire 18X8 18 GA 250\'', '18X8TW', 125.0, 0.4499),
                (60, '12" Bypass Flex & Fittings', '12X10D', 1.0, 71.37),
                (70, '40 VA Transformer', '40VAT', 1.0, 14.616),
                (80, 'Sheet Metal Labor', 'SMLC', 1.5, 66.32),
                (90, 'Installation Labor', 'INSTLC', 1.5, 66.32),
                (100, 'Service Labor', 'SLC', 5.0, 66.32),
                (110, 'One Year Service', 'OYSC', 2.5, 66.32),
            ],
            'APR-3Z-HP': [
                (10, 'Aprilaire Damper Control Panel AA6303 (3-Zone HP)', 'AA6303', 1.0, 93.2295),
                (20, 'Thermostat Braeburn #1020NC', 'O-8444', 3.0, 46.44),
                (30, 'Damper Side Mount 12X10 AA6733', '12X10SMDAA6733', 3.0, 73.1955),
                (40, 'Damper Bypass Round 12" AA6112', '12BPDAA6112', 1.0, 74.1405),
                (50, 'Thermostat Wire 18X8 18 GA 250\'', '18X8TW', 125.0, 0.4499),
                (60, '12" Bypass Flex & Fittings', '12X10D', 1.0, 71.37),
                (70, '40 VA Transformer', '40VAT', 1.0, 14.616),
                (80, 'Sheet Metal Labor', 'SMLC', 1.5, 66.32),
                (90, 'Installation Labor', 'INSTLC', 1.5, 66.32),
                (100, 'Service Labor', 'SLC', 5.0, 66.32),
                (110, 'One Year Service', 'OYSC', 2.5, 66.32),
            ],
            'APR-4Z': [
                (10, 'Aprilaire Damper Control Panel AA6404 (4-Zone)', 'AA6404', 1.0, 165.228),
                (20, 'Thermostat Braeburn #1020NC', 'O-8444', 3.0, 46.44),
                (30, 'Damper Side Mount 12X10 AA6733', '12X10SMDAA6733', 4.0, 73.1955),
                (40, 'Damper Bypass Round 12" AA6112', '12BPDAA6112', 1.0, 74.1405),
                (50, 'Thermostat Wire 18X8 18 GA 250\'', '18X8TW', 200.0, 0.4499),
                (60, '12" Bypass Flex & Fittings', '12X10D', 1.0, 71.37),
                (70, '40 VA Transformer', '40VAT', 1.0, 14.616),
                (80, 'Sheet Metal Labor', 'SMLC', 2.0, 66.32),
                (90, 'Installation Labor', 'INSTLC', 2.0, 66.32),
                (100, 'Service Labor', 'SLC', 6.0, 66.32),
                (110, 'One Year Service', 'OYSC', 3.5, 66.32),
            ],
            'EWC-2Z': [
                (10, 'EWC Damper Control Panel BMPLUS 3000', 'BMPLUS 3000 EWC', 1.0, 199.9188),
                (20, 'Thermostat Braeburn #1020NC', 'O-8444', 1.0, 46.44),
                (30, 'EWC Damper Side Mount 10X12 MA15S', 'EWC-10X12-MA15S', 2.0, 239.76),
                (40, 'Damper Bypass Round 12"', 'DAMPBAR12INC', 1.0, 226.8),
                (50, 'Thermostat Wire 18X8 18 GA 250\'', '18X8TW', 75.0, 0.4499),
                (60, '12" Bypass Flex & Fittings', '12X10D', 1.0, 71.37),
                (70, '40 VA Transformer', '40VAT', 1.0, 14.616),
                (80, 'Sheet Metal Labor', 'SMLC', 1.0, 66.32),
                (90, 'Installation Labor', 'INSTLC', 1.0, 66.32),
                (100, 'Service Labor', 'SLC', 3.0, 66.32),
                (110, 'One Year Service', 'OYSC', 1.5, 66.32),
            ],
            'EWC-3Z': [
                (10, 'EWC Damper Control Panel BMPLUS 3000', 'BMPLUS 3000 EWC', 1.0, 199.9188),
                (20, 'Thermostat Braeburn #1020NC', 'O-8444', 2.0, 46.44),
                (30, 'EWC Damper Side Mount 10X12 MA15S', 'EWC-10X12-MA15S', 3.0, 239.76),
                (40, 'Damper Bypass Round 12"', 'DAMPBAR12INC', 1.0, 226.8),
                (50, 'Thermostat Wire 18X8 18 GA 250\'', '18X8TW', 125.0, 0.4499),
                (60, '12" Bypass Flex & Fittings', '12X10D', 1.0, 71.37),
                (70, '40 VA Transformer', '40VAT', 1.0, 14.616),
                (80, 'Sheet Metal Labor', 'SMLC', 1.5, 66.32),
                (90, 'Installation Labor', 'INSTLC', 1.5, 66.32),
                (100, 'Service Labor', 'SLC', 5.0, 66.32),
                (110, 'One Year Service', 'OYSC', 2.5, 66.32),
            ],
            'EWC-4Z': [
                (10, 'EWC Damper Control Panel BMPLUS 5000', 'BMPLUS 5000 EWC', 1.0, 267.7212),
                (20, 'Thermostat Braeburn #1020NC', 'O-8444', 3.0, 46.44),
                (30, 'EWC Damper Side Mount 10X12 MA15S', 'EWC-10X12-MA15S', 4.0, 239.76),
                (40, 'Damper Bypass Round 12"', 'DAMPBAR12INC', 1.0, 226.8),
                (50, 'Thermostat Wire 18X8 18 GA 250\'', '18X8TW', 200.0, 0.4499),
                (60, '12" Bypass Flex & Fittings', '12X10D', 1.0, 71.37),
                (70, '40 VA Transformer', '40VAT', 1.0, 14.616),
                (80, 'Sheet Metal Labor', 'SMLC', 2.0, 66.32),
                (90, 'Installation Labor', 'INSTLC', 2.0, 66.32),
                (100, 'Service Labor', 'SLC', 6.0, 66.32),
                (110, 'One Year Service', 'OYSC', 3.5, 66.32),
            ],
            # ── C: Exhaust Runs ───────────────────────────────────────────────────
            'DRYER-WALL': [
                (10, 'ROUND PIPE 4"X10\'', '4" RD', 15.0, 0.9397),
                (20, 'ROUND ELL 4" GALV 30 GA', '4" RD ELL', 3.0, 1.3755),
                (30, 'DRYER BOX 3-1/2" UPFLOW', '350 DVB', 1.0, 32.97),
                (40, 'WALL CAP 4" ALUMINUM', '4" WCA', 1.0, 4.7775),
                (50, '28 GAGE 1" STRAP MATERIAL', '1" STRAP', 3.0, 0.132216),
                (60, 'TAPE ALUM FOIL 3"X60 YDS', '3" AFT', 4.0, 0.07028),
            ],
            'DRYER-ROOF': [
                (10, 'ROUND PIPE 4"X10\'', '4" RD', 10.0, 0.9397),
                (20, 'ROUND ELL 4" GALV 30 GA', '4" RD ELL', 3.0, 1.3755),
                (30, 'DRYER BOX 3-1/2" UPFLOW', '350 DVB', 1.0, 32.97),
                (40, 'ROOF JACK 4"X4" W/SCREEN & DAMPER', '4" RJ109NS', 1.0, 13.4925),
                (50, '28 GAGE 1" STRAP MATERIAL', '1" STRAP', 3.0, 0.132216),
                (60, 'FLEX DUCT R8 INSULATED 4"X18\'', '4"X18\' Q46518', 1.0, 28.4025),
                (70, 'TAPE ALUM FOIL 3"X60 YDS', '3" AFT', 4.5, 0.07028),
            ],
            'RANGE-ROOF': [
                (10, 'ROUND PIPE 6"X10\'', '6" RD', 20.0, 0.966),
                (20, 'ROUND ELL 6" GALV 30 GA', '6" RD ELL', 3.0, 1.5645),
                (30, 'ROOF JACK 6" STEEL BLACK DAMPER #634M', '6" RJ634M', 1.0, 47.96),
                (40, 'SHEET METAL DUCT 10X4X12 28GA', '10X4D', 3.0, 3.70),
                (50, 'STRAIGHT STACK BOOT 10X3-1/4X6', '10X31/4X6 SSB', 1.0, 3.7695),
                (60, 'TAPE ALUM FOIL 3"X60 YDS', '3" AFT', 8.0, 0.07028),
            ],
            'RANGE-WALL': [
                (10, 'ROUND PIPE 6"X10\'', '6" RD', 20.0, 0.966),
                (20, 'ROUND ELL 6" GALV 30 GA', '6" RD ELL', 3.0, 1.5645),
                (30, 'WALL CAP 6" SPRING LOADED ALUMINUM', '6" WCSLA', 1.0, 16.695),
                (40, 'SHEET METAL DUCT 10X4X12 28GA', '10X4D', 3.0, 3.70),
                (50, 'ELL STACK BOOT 10X3-1/4X6', '10X31/4X6 ELSB', 1.0, 3.7695),
                (60, 'TAPE ALUM FOIL 3"X60 YDS', '3" AFT', 8.0, 0.07028),
            ],
            'RANGE-DOWN': [
                (10, 'ROUND PIPE 6"X10\'', '6" RD', 15.0, 0.966),
                (20, 'ROUND ELL 6" GALV 30 GA', '6" RD ELL', 3.0, 1.5645),
                (30, 'WALL CAP 6" SPRING LOADED ALUMINUM', '6" WCSLA', 1.0, 16.695),
                (40, 'TAPE ALUM FOIL 3"X60 YDS', '3" AFT', 10.0, 0.07028),
                (50, 'SHEET METAL LABOR (RETURN TRIP)', 'SMLC', 1.0, 66.32),
            ],
            'RANGE-TELE': [
                (10, 'ROUND PIPE 6"X10\'', '6" RD', 15.0, 0.966),
                (20, 'ROUND ELL 6" GALV 30 GA', '6" RD ELL', 3.0, 1.5645),
                (30, 'WALL CAP 6" SPRING LOADED ALUMINUM', '6" WCSLA', 1.0, 16.695),
                (40, 'TAPE ALUM FOIL 3"X60 YDS', '3" AFT', 10.0, 0.07028),
                (50, 'SHEET METAL LABOR (RETURN TRIP)', 'SMLC', 1.5, 66.32),
            ],
            'RANGE-DLUX': [
                (10, 'ROUND PIPE 10"X5\'', '10" RD', 25.0, 1.932),
                (20, 'ROUND ELL 10" GALV 26 GA', '10" RD ELL', 4.0, 4.536),
                (30, 'WALL CAP 10" ALUMINUM', '10" WCA', 1.0, 81.40),
                (40, 'TAPE ALUM FOIL 3"X60 YDS', '3" AFT', 20.0, 0.07028),
                (50, 'SHEET METAL LABOR', 'SMLC', 1.5, 66.32),
            ],
            # ── D: Class B Flues (typical 31\' install) ───────────────────────────
            '4" B-VENT': [
                (10, 'B VENT 4"X5\'', '4RV5', 5.0, 30.305),
                (20, 'B VENT 4"X3\'', '4RV3', 1.0, 19.745),
                (30, 'B VENT 4"X2\'', '4RV2', 1.0, 13.64),
                (40, 'B VENT 4"X1\'', '4RV12', 1.0, 8.80),
                (50, 'B VENT 4" 60 DEG ADJ', '4RV60', 2.0, 17.05),
                (60, 'B VENT 4" TEE', '4RVTS', 1.0, 33.297),
                (70, 'B VENT 4" TEE CAP', '4RVTC', 1.0, 2.695),
                (80, 'B VENT 4" ROOF CAP', '4RVRT', 1.0, 13.695),
                (90, 'B VENT 4" STORM COLLAR', '4RVSC', 1.0, 2.42),
                (100, 'B VENT 4" ADJ ROOF FLASHING 6-12/12', '4RVAF12/12', 1.0, 24.805),
            ],
            '5" B-VENT': [
                (10, 'B VENT 5"X5\'', '5RV5', 5.0, 34.375),
                (20, 'B VENT 5"X3\'', '5RV3', 1.0, 25.245),
                (30, 'B VENT 5"X2\'', '5RV2', 1.0, 19.36),
                (40, 'B VENT 5"X1\'', '5RV12', 1.0, 12.485),
                (50, 'B VENT 5" 60 DEG ADJ', '5RV60', 2.0, 19.36),
                (60, 'B VENT 5" TEE', '5RVTS', 1.0, 38.555),
                (70, 'B VENT 5" TEE CAP', '5RVTC', 1.0, 5.50),
                (80, 'B VENT 5" ROOF CAP', '5RVRT', 1.0, 18.645),
                (90, 'B VENT 5" STORM COLLAR', '5RVSC', 1.0, 5.72),
                (100, 'B VENT 5" ADJ ROOF FLASHING 6-12/12', '5RVAF12/12', 1.0, 29.095),
            ],
            '6" B-VENT': [
                (10, 'B VENT 6"X5\'', '6RV5', 5.0, 73.139),
                (20, 'B VENT 6"X3\'', '6RV3', 1.0, 31.482),
                (30, 'B VENT 6"X2\'', '6RV2', 1.0, 24.717),
                (40, 'B VENT 6"X1\'', '6RV12', 1.0, 14.74),
                (50, 'B VENT 6" 60 DEG ADJ', '6RV60', 2.0, 24.86),
                (60, 'B VENT 6" TEE', '6RVTS', 1.0, 44.528),
                (70, 'B VENT 6" TEE CAP', '6RVTC', 1.0, 4.983),
                (80, 'B VENT 6" ROOF CAP', '6RVRT', 1.0, 25.135),
                (90, 'B VENT 6" STORM COLLAR', '6RVSC', 1.0, 6.248),
                (100, 'B VENT 6" ADJ ROOF FLASHING 6-12/12', '6RVAF12/12', 1.0, 38.423),
            ],
            # ── E: B Vent Connectors ──────────────────────────────────────────────
            'CONN-1': [
                (10, 'B VENT 4" INCREASER', '4RVI5', 1.0, 17.655),
                (20, 'B VENT 4" 90 DEG ADJ', '4RV90', 1.0, 24.20),
                (30, 'B VENT 4"X5\' DOUBLE WALL FLEX CONNECTOR', '4DWC5', 1.0, 62.645),
                (40, 'SHEET METAL LABOR', 'SMLC', 0.25, 66.32),
            ],
            'CONN-2': [
                (10, 'B VENT 4" INCREASER', '4RVI5', 1.0, 17.655),
                (20, 'B VENT 4" 90 DEG ADJ', '4RV90', 1.0, 24.20),
                (30, 'B VENT 4"X1\'', '4RV12', 1.0, 8.80),
                (40, 'B VENT 4"X5\' DOUBLE WALL FLEX CONNECTOR', '4DWC5', 1.0, 62.645),
                (50, 'SHEET METAL LABOR', 'SMLC', 0.25, 66.32),
            ],
            'CONN-3': [
                (10, 'B VENT 4" INCREASER', '4RVI5', 1.0, 17.655),
                (20, 'B VENT 4" 60 DEG ADJ', '4RV60', 2.0, 17.05),
                (30, 'B VENT 4"X2\'', '4RV2', 1.0, 13.64),
                (40, 'B VENT 4"X3\' DOUBLE WALL FLEX CONNECTOR', '4DWC3', 1.0, 48.73),
                (50, 'SHEET METAL LABOR', 'SMLC', 0.25, 66.32),
            ],
            'CONN-4': [
                (10, 'B VENT 4" INCREASER', '4RVI5', 1.0, 17.655),
                (20, 'B VENT 4" 90 DEG ADJ', '4RV90', 1.0, 24.20),
                (30, 'B VENT 4"X2\'', '4RV2', 1.0, 13.64),
                (40, 'B VENT 4"X3\' DOUBLE WALL FLEX CONNECTOR', '4DWC3', 1.0, 48.73),
                (50, 'B VENT 4"X5\' DOUBLE WALL FLEX CONNECTOR', '4DWC5', 1.0, 62.645),
                (60, 'SHEET METAL LABOR', 'SMLC', 0.25, 66.32),
            ],
            # ── F: Combustion Air ─────────────────────────────────────────────────
            'COMB-AIR': [
                (10, 'RETURN GRILL 16X16', '16X16 RG', 2.0, 6.283),
                (20, 'RETURN GRILL 24X24', '24X24 RG', 1.0, 19.3125),
            ],
            # ── H: Condensate Drain ───────────────────────────────────────────────
            'CDA': [
                (10, 'PVC 3/4"X10\' SCHEDULE 40 (primary+emerg)', '3/4"X10\' PVC', 70.0, 0.31185),
                (20, 'PVC 3/4" MALE ADAPTER', '3/4" MA PVC', 1.0, 0.363),
                (30, 'PVC 3/4" PLUG', '3/4" PLUG PVC', 1.0, 1.012),
                (40, 'PVC 3/4" 45 ELL', '3/4" 45 PVC', 4.0, 0.913),
                (50, 'PVC 3/4" 90 ELL', '3/4" 90 PVC', 10.0, 0.396),
                (60, 'PVC 3/4" TEE', '3/4" TEE PVC', 1.0, 0.517),
                (70, 'PVC 3/4" TRAP', '3/4" TRAP PVC', 2.0, 1.419),
                (80, 'EMT STRAP 1"', '1" EMTS', 16.0, 0.2916),
                (90, 'SCREWS 8X3/4 HEX HEAD', '8X3/4" HHS', 16.0, 0.016789),
            ],
            'CDB': [
                (10, 'PVC 3/4"X10\' SCHEDULE 40', '3/4"X10\' PVC', 10.0, 0.31185),
                (20, 'PVC 3/4" COUPLING', '3/4" COUP PVC', 2.0, 0.319),
                (30, 'PVC 3/4" MALE ADAPTER', '3/4" MA PVC', 1.0, 0.363),
                (40, 'PVC 3/4" PLUG', '3/4" PLUG PVC', 1.0, 1.012),
                (50, 'PVC 3/4" 45 ELL', '3/4" 45 PVC', 2.0, 0.913),
                (60, 'PVC 3/4" 90 ELL', '3/4" 90 PVC', 4.0, 0.396),
                (70, 'PVC 3/4" TRAP', '3/4" TRAP PVC', 2.0, 1.419),
                (80, 'EMT STRAP 1"', '1" EMTS', 5.0, 0.2916),
                (90, 'SCREWS 8X3/4 HEX HEAD', '8X3/4" HHS', 5.0, 0.016789),
            ],
            # ── J: Control Wiring ─────────────────────────────────────────────────
            'CTRL-WIRE': [
                (10, 'THERMOSTAT WIRE 18X8 18 GA 250\'', '18X8TW', 90.0, 0.4499),
                (20, 'TIES PLASTIC 8" 1000', '8" PT', 18.0, 0.04521),
                (30, 'WIRE NUTS 72B', '72B BLUE', 16.0, 0.341),
            ],
            # ── K: Copper Line Sets ───────────────────────────────────────────────
            'LS-25': [
                (10, 'COPPER LINE SET (per foot)', 'CLS', 25.0, 5.223),
                (20, 'EMT STRAP 1-1/4"', '1 1/4" EMTS', 10.0, 0.4428),
                (30, 'TIES PLASTIC 8" 1000', '8" PT', 10.0, 0.04521),
                (40, 'SCREWS 10X1 HEX HEAD', '10X1 HHSTS', 12.0, 0.036643),
                (50, 'KICK PLATES 4X6 (STUD GUARD)', '4X6 KP', 4.0, 1.2285),
            ],
            'LS-35': [
                (10, 'COPPER LINE SET (per foot)', 'CLS', 35.0, 5.223),
                (20, 'EMT STRAP 1-1/4"', '1 1/4" EMTS', 10.0, 0.4428),
                (30, 'TIES PLASTIC 8" 1000', '8" PT', 10.0, 0.04521),
                (40, 'SCREWS 10X1 HEX HEAD', '10X1 HHSTS', 12.0, 0.036643),
                (50, 'KICK PLATES 4X6 (STUD GUARD)', '4X6 KP', 4.0, 1.2285),
            ],
            'LS-50': [
                (10, 'COPPER LINE SET (per foot)', 'CLS', 50.0, 5.223),
                (20, 'EMT STRAP 1-1/4"', '1 1/4" EMTS', 10.0, 0.4428),
                (30, 'TIES PLASTIC 8" 1000', '8" PT', 10.0, 0.04521),
                (40, 'SCREWS 10X1 HEX HEAD', '10X1 HHSTS', 12.0, 0.036643),
                (50, 'KICK PLATES 4X6 (STUD GUARD)', '4X6 KP', 4.0, 1.2285),
            ],
            # ── L: Equipment Mounting Kits ────────────────────────────────────────
            'EMKV-1': [
                (10, 'SHEET METAL DRAIN PAN 31X31X2', '31X31X2DP', 1.0, 15.1536),
                (20, 'PVC 3/4" MALE DRAIN ADAPTER W/WASHER', '3/4" MDA PVC', 1.0, 2.728),
                (30, 'SILICONE SEALANT (CLEAR) 10.3OZ', 'SSC', 0.25, 5.5188),
                (40, 'MOUNTING BLOCKS 2" FURNACE', '2" FMB', 4.0, 2.519),
                (50, 'FLOAT SWITCH LITTLE GIANT #L599122', 'L599122', 1.0, 13.992),
                (60, 'THERMOSTAT WIRE 20X5 20 GA 250\'', '20X5TW', 4.0, 0.29128),
                (70, 'WIRE NUTS 72B', '72B BLUE', 4.0, 0.341),
            ],
            'EMKV-2': [
                (10, 'SHEET METAL DRAIN PAN 31X36X2', '31X36X2DP', 1.0, 17.1864),
                (20, 'PVC 3/4" MALE DRAIN ADAPTER W/WASHER', '3/4" MDA PVC', 1.0, 2.728),
                (30, 'SILICONE SEALANT (CLEAR) 10.3OZ', 'SSC', 0.25, 5.5188),
                (40, 'MOUNTING BLOCKS 2" FURNACE', '2" FMB', 4.0, 2.519),
                (50, 'FLOAT SWITCH LITTLE GIANT #L599122', 'L599122', 1.0, 13.992),
                (60, 'THERMOSTAT WIRE 20X5 20 GA 250\'', '20X5TW', 4.0, 0.29128),
                (70, 'WIRE NUTS 72B', '72B BLUE', 4.0, 0.341),
            ],
            'EMKH': [
                (10, 'SHEET METAL DRAIN PAN 31X60X2', '31X60X2DP', 1.0, 27.1656),
                (20, 'PVC 3/4" MALE DRAIN ADAPTER W/WASHER', '3/4" MDA PVC', 1.0, 2.728),
                (30, 'SILICONE SEALANT (CLEAR) 10.3OZ', 'SSC', 0.25, 5.5188),
                (40, 'PUMP UPS 3" HEAT PUMP LEGS', '3" PU', 4.0, 2.0895),
                (50, 'FLOAT SWITCH LITTLE GIANT #L599122', 'L599122', 1.0, 13.992),
                (60, 'THERMOSTAT WIRE 20X5 20 GA 250\'', '20X5TW', 4.0, 0.29128),
                (70, 'WIRE NUTS 72B', '72B BLUE', 4.0, 0.341),
            ],
            # ── N: Air Cleaners ───────────────────────────────────────────────────
            'AC-HE1400': [
                (10, 'AIR CLEANER ELECT TRION #HE1400 16X25', '16X25 HE1400', 1.0, 691.075),
                (20, 'SERVICE LABOR', 'SLC', 4.0, 66.32),
            ],
            'AC-HF100-16': [
                (10, 'AIR CLEANER MEDIA HWELL #HF100F2002 16X25', '16X25 F100', 1.0, 61.6245),
                (20, 'SERVICE LABOR', 'SLC', 1.5, 66.32),
            ],
            'AC-HF100-20': [
                (10, 'AIR CLEANER MEDIA HWELL #HF100F2010 20X25', '20X25 F100', 1.0, 61.6245),
                (20, 'SERVICE LABOR', 'SLC', 1.5, 66.32),
            ],
            # ── Q: Laundry Chutes ─────────────────────────────────────────────────
            'LAUNDRY': [
                (10, 'SHEET METAL FLAT 90 10X10 28GA', '10X10F90', 1.0, 7.61),
                (20, 'SHEET METAL DUCT 10X10X12 28GA', '10X10D', 8.0, 4.67),
                (30, 'LAUNDRY CHUTE DOOR 10"X10" #L3210W', '10"X10" LCD', 1.0, 158.125),
                (40, 'SHEET METAL LABOR', 'SMLC', 1.0, 66.32),
            ],
            'LAUNDRY-2ST': [
                (10, 'SHEET METAL FLAT 90 10X10 28GA', '10X10F90', 1.0, 7.61),
                (20, 'SHEET METAL DUCT 10X10X12 28GA', '10X10D', 18.0, 4.67),
                (30, 'LAUNDRY CHUTE DOOR 10"X10" #L3210W', '10"X10" LCD', 1.0, 158.125),
                (40, 'SHEET METAL LABOR', 'SMLC', 1.5, 66.32),
            ],
            # ── R: Fresh Air Systems ──────────────────────────────────────────────
            'FAS-1': [
                (10, 'APRIL-AIR VENTILATION SYSTEM #8126X', 'A-8126X', 1.0, 149.5725),
                (20, 'AIR TITE 6"', '6" AT', 1.0, 2.856),
                (30, 'ROUND ELL 6" GALV 30 GA', '6" RD ELL', 1.0, 1.5645),
                (40, 'ROUND PIPE 6"X10\'', '6" RD', 2.0, 0.966),
                (50, 'FLEX DUCT R8 INSULATED 6"X18\'', '6"X18\' Q66518', 1.0, 32.97),
                (60, 'WALL CAP 6" SCREENED FRESH AIR', '6" WCSFA', 1.0, 13.6185),
                (70, 'THERMOSTAT WIRE 20X5 20 GA 250\'', '20X5TW', 30.0, 0.29128),
                (80, 'SCREWS 8X3/4 HEX HEAD', '8X3/4" HHS', 15.0, 0.016789),
                (90, 'TAPE ALUM FOIL 3"X60 YDS', '3" AFT', 10.0, 0.07028),
                (100, 'SHEET METAL LABOR', 'SMLC', 1.0, 66.32),
            ],
            'FAS-2': [
                (10, '14X14X12 METAL BOX', '14x14x12 MB', 1.0, 7.43),
                (20, 'BROAN 6" F/A DAMPER W/PRESSURE SENSOR', 'C-MD6TU', 1.0, 149.0475),
                (30, 'AIR TITE 6"', '6" AT', 1.0, 2.856),
                (40, '14X14 FILTER GRILL', '14X14 FG', 1.0, 10.5369),
                (50, '14X14 AIR FILTER', '14X14X1 AF', 1.0, 2.016),
                (60, 'FLEX DUCT R8 INSULATED 6"X18\'', '6"X18\' Q66518', 1.0, 32.97),
                (70, 'WALL CAP 6" SCREENED FRESH AIR', '6" WCSFA', 1.0, 13.6185),
                (80, 'THERMOSTAT WIRE 20X5 20 GA 250\'', '20X5TW', 50.0, 0.29128),
                (90, 'SCREWS 8X3/4 HEX HEAD', '8X3/4" HHS', 9.0, 0.016789),
                (100, 'TAPE ALUM FOIL 3"X60 YDS', '3" AFT', 7.0, 0.07028),
                (110, 'SHEET METAL LABOR', 'SMLC', 1.0, 66.32),
            ],
            'FAS-3': [
                (10, '14X14X12 METAL BOX', '14x14x12 MB', 1.0, 7.43),
                (20, 'BROAN 8" F/A DAMPER W/PRESSURE SENSOR', 'D-MD8TU', 1.0, 169.365),
                (30, 'AIR TITE 8"', '8" AT', 1.0, 3.528),
                (40, '14X14 FILTER GRILL', '14X14 FG', 1.0, 10.5369),
                (50, '14X14 AIR FILTER', '14X14X1 AF', 1.0, 2.016),
                (60, 'FLEX DUCT R8 INSULATED 8"X18\'', '8"X18\' Q86518', 1.0, 40.425),
                (70, 'WALL CAP 8" SCREENED FRESH AIR', '8" WCSFA', 1.0, 17.292),
                (80, 'THERMOSTAT WIRE 20X5 20 GA 250\'', '20X5TW', 50.0, 0.29128),
                (90, 'SCREWS 8X3/4 HEX HEAD', '8X3/4" HHS', 9.0, 0.016789),
                (100, 'TAPE ALUM FOIL 3"X60 YDS', '3" AFT', 7.0, 0.07028),
                (110, 'SHEET METAL LABOR', 'SMLC', 1.0, 66.32),
            ],
            'FAS-4': [
                (10, '16X16X12 METAL BOX', '16x16x16 MB', 1.0, 9.60),
                (20, 'BROAN 10" F/A DAMPER W/PRESSURE SENSOR', 'E-MD10TU', 1.0, 208.6875),
                (30, 'AIR TITE 10"', '10" AT', 1.0, 3.7695),
                (40, '16X16 FILTER GRILL', '16X16 FG', 1.0, 15.141),
                (50, '16X16 AIR FILTER', '16X16X1 AF', 1.0, 2.079),
                (60, 'FLEX DUCT R8 INSULATED 10"X18\'', '10"X18\' Q106518', 1.0, 49.14),
                (70, 'WALL CAP 10" SCREENED FRESH AIR', '10" WCSFA', 1.0, 22.396),
                (80, 'THERMOSTAT WIRE 20X5 20 GA 250\'', '20X5TW', 50.0, 0.29128),
                (90, 'SCREWS 8X3/4 HEX HEAD', '8X3/4" HHS', 9.0, 0.016789),
                (100, 'TAPE ALUM FOIL 3"X60 YDS', '3" AFT', 7.0, 0.07028),
                (110, 'SHEET METAL LABOR', 'SMLC', 1.0, 66.32),
            ],
            'FAS-5': [
                (10, 'HONEYWELL VENTILATION SYSTEM Y8150', 'J-Y8150', 1.0, 99.75),
                (20, 'AIR TITE 6"', '6" AT', 1.0, 2.856),
                (30, 'ROUND ELL 6" GALV 30 GA', '6" RD ELL', 1.0, 1.5645),
                (40, 'ROUND PIPE 6"X10\'', '6" RD', 2.0, 0.966),
                (50, 'FLEX DUCT R8 INSULATED 6"X18\'', '6"X18\' Q66518', 1.0, 32.97),
                (60, 'WALL CAP 6" SCREENED FRESH AIR', '6" WCSFA', 1.0, 13.6185),
                (70, 'THERMOSTAT WIRE 20X5 20 GA 250\'', '20X5TW', 30.0, 0.29128),
                (80, 'SCREWS 8X3/4 HEX HEAD', '8X3/4" HHS', 15.0, 0.016789),
                (90, 'TAPE ALUM FOIL 3"X60 YDS', '3" AFT', 10.0, 0.07028),
                (100, 'SHEET METAL LABOR', 'SMLC', 1.0, 66.32),
            ],
            # ── S: Transfer Grill ─────────────────────────────────────────────────
            'XFER-GRILL': [
                (10, 'RETURN GRILL 12X6', '12X6 RG', 2.0, 2.781),
                (20, 'METAL SLEEVES 12X6X2"', '12X6x2" MS', 1.0, 2.60),
                (30, '2\' DRIVES', "2' Drives", 4.0, 0.84),
                (40, 'SCREWS 8X3/4 HEX HEAD', '8X3/4" HHS', 8.0, 0.016789),
                (50, 'SHEET METAL LABOR', 'SMLC', 0.25, 66.32),
            ],
        }

        variant_map = {v.variant_code: v for v in db.query(KitVariant).all()}
        added = 0
        for v_code, comps in COMPONENT_SEED.items():
            variant = variant_map.get(v_code)
            if not variant:
                continue
            # Skip if this variant already has components
            existing = db.query(KitComponent).filter_by(kit_variant_id=variant.id).count()
            if existing:
                continue
            for sort_order, description, part_number, quantity, unit_cost in comps:
                db.add(KitComponent(
                    kit_variant_id=variant.id,
                    sort_order=sort_order,
                    description=description,
                    part_number=part_number,
                    quantity=quantity,
                    unit_cost=unit_cost,
                ))
                added += 1
        db.commit()
        if added:
            print(f"Kit components: {added} inserted from 2019 XLS data.")
    finally:
        db.close()

_seed_kit_components()


def _seed_company_logo():
    """
    Ensure the CompanySettings row exists with the bundled logo.
    Uses the pre-encoded constant so no runtime file I/O is needed.
    """
    try:
        from static.logo_b64 import LOGO_DATA_URI as logo_b64
    except ImportError:
        print("[logo] logo_b64.py not found — skipping seed")
        return

    from core.database import SessionLocal
    db = SessionLocal()
    try:
        row = db.query(CompanySettings).first()
        if row is None:
            db.add(CompanySettings(
                company_name="Metcalfe Heating & Air Conditioning",
                logo_b64=logo_b64,
            ))
            db.commit()
            print("[logo] CompanySettings row created with bundled logo.")
        elif not row.logo_b64:
            row.logo_b64 = logo_b64
            db.commit()
            print("[logo] logo_b64 seeded into existing row.")
        else:
            print("[logo] logo already present in DB.")
    finally:
        db.close()

_seed_company_logo()


app = FastAPI(
    title="HVAC Bid System — POC",
    version="0.1.0",
)

_FRONTEND_ORIGINS = [o.strip() for o in os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000"
).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(plans.router,     prefix="/api/plans",     tags=["plans"])
app.include_router(equipment.router, prefix="/api/equipment", tags=["equipment"])
app.include_router(builders.router,  prefix="/api/builders",  tags=["builders"])
app.include_router(projects.router,  prefix="/api/projects",  tags=["projects"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(kit.router,       prefix="/api/kit",       tags=["kit"])
app.include_router(auth.router,      prefix="/api/auth",      tags=["auth"])
app.include_router(files.router,     prefix="/api/files",     tags=["files"])
app.include_router(search.router,    prefix="/api/search",    tags=["search"])
app.include_router(feedback.router,  prefix="/api/feedback",  tags=["feedback"])
app.include_router(company.router,   prefix="/api/company",   tags=["company"])

if _ENTRA_ENABLED:
    app.include_router(entra_router)
if _SF_ENABLED:
    app.include_router(sf_router)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "estimator": settings.ESTIMATOR_NAME,
    }


# Serve built React frontend — API routes above take priority
from fastapi.responses import FileResponse, Response
_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "dist")

if os.path.isdir(_DIST):
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        file = os.path.join(_DIST, full_path)
        if os.path.isfile(file):
            # Hashed assets (JS/CSS/images) can be cached long-term
            if full_path.startswith("assets/"):
                return FileResponse(file, headers={"Cache-Control": "public, max-age=31536000, immutable"})
            return FileResponse(file)
        # index.html must never be cached so browsers always fetch the latest bundle
        return FileResponse(
            os.path.join(_DIST, "index.html"),
            headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
        )
