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
        "UPDATE company_settings SET company_name = 'Metcalfe HVAC' WHERE company_name = 'Insight HVAC'",
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
            # ── M: Humidifiers (Section P items 10-11) ───────────────
            ("M","Humidifiers","HUM-BYPASS", "Aprilaire Model 600 Humidifier", 312.22, 0, 10),
            ("M","Humidifiers","HUM-POWER",  "Aprilaire Model 700 Humidifier", 424.22, 0, 20),
            # ── N: Air Cleaners (Section P items 12-17) ──────────────
            ("N","Air Cleaners","AC-HE1400",    "Trion Electronic HE1400 16x25",        956.36, 0, 10),
            ("N","Air Cleaners","AC-HE2000",    "Trion Electronic HE2000 20x25",        979.68, 0, 20),
            ("N","Air Cleaners","AC-HF100-16",  "HYW Media HF100F2002 16x25",           161.10, 0, 30),
            ("N","Air Cleaners","AC-HF100-20",  "HYW Media HF100F2010 20x25",           161.10, 0, 40),
            ("N","Air Cleaners","AC-LX16",      "Lennox Media HCC16-28 w/HCXF16 MERV", 400.00, 0, 50),
            ("N","Air Cleaners","AC-LX20",      "Lennox Media HCC20-28 w/HCXF20 MERV", 550.00, 0, 60),
            ("N","Air Cleaners","AC-HF300-16",  "HYW Electronic HF300E1019 16x25",     1027.55, 0, 70),
            ("N","Air Cleaners","AC-HF300-20",  "HYW Electronic HF300E1035 20x25",     1122.96, 0, 80),
            # ── O: Energy Recovery Ventilator (Section P item 18) ────
            ("O","Energy Recovery Ventilator","ERV",    "HYW ERV ER200",                          2351.45, 0, 10),
            ("O","Energy Recovery Ventilator","AA-8145","Aprilaire Ventilation System Model 8145",  339.75, 0, 20),
            # ── P: Duct Sealing (Section P item 19: $125.65) ─────────
            ("P","Duct Sealing","MASTIC-PKG", "Mastic Duct Sealing Package", 125.65, 0, 10),
            # ── Q: Laundry Chutes (Section P items 20-21) ────────────
            ("Q","Laundry Chutes","LC1S", "Laundry Chute 10x10 \u2014 One Story", 319.03, 0, 10),
            ("Q","Laundry Chutes","LC2S", "Laundry Chute 10x10 \u2014 Two Story", 417.57, 0, 20),
            # ── R: Fresh-Air ─────────────────────────────────────────
            ("R","Fresh-Air","CONCENTRIC", "Concentric Termination Kit",     39.60, 0, 10),
            ("R","Fresh-Air","CN2220",     "Condensate Neutralizer CN2-220", 62.10, 0, 20),
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
            ("U","Misc. Accessories","SLABS",    "Polytex A/C Pads + Pump-Ups + Locking Caps", 42.52, 0, 90),
            ("U","Misc. Accessories","WALLBRKT", 'Wall Brackets (36")',                    134.81, 0, 100),
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
