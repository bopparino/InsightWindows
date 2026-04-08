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
    """Seed the 2019 kit variant pricing table if empty."""
    from core.database import SessionLocal
    db = SessionLocal()
    try:
        if db.query(KitVariant).first():
            return  # already seeded

        VARIANTS = [
            # ── A: Sheet Metal Runs ──────────────────────────────────
            ("A","Sheet Metal Runs","4\" SMR","4\" Sheet Metal Run",       19.34, 1.04, 10),
            ("A","Sheet Metal Runs","5\" SMR","5\" Sheet Metal Run",       19.86, 1.40, 20),
            ("A","Sheet Metal Runs","6\" SMR","6\" Sheet Metal Run",       18.64, 1.41, 30),
            ("A","Sheet Metal Runs","7\" SMR","7\" Sheet Metal Run",       23.85, 1.85, 40),
            ("A","Sheet Metal Runs","8\" SMR","8\" Sheet Metal Run",       31.58, 2.08, 50),
            # ── B: Ductboard Runs (R8) ───────────────────────────────
            ("B","Ductboard Runs (R8)","4\" DBR","4\" Ductboard Run R8",   38.25, 1.57, 10),
            ("B","Ductboard Runs (R8)","5\" DBR","5\" Ductboard Run R8",   41.94, 1.72, 20),
            ("B","Ductboard Runs (R8)","6\" DBR","6\" Ductboard Run R8",   44.06, 1.83, 30),
            ("B","Ductboard Runs (R8)","7\" DBR","7\" Ductboard Run R8",   48.50, 2.02, 40),
            ("B","Ductboard Runs (R8)","8\" DBR","8\" Ductboard Run R8",   54.31, 2.25, 50),
            # ── C: Exhaust Runs ──────────────────────────────────────
            ("C","Exhaust Runs","BATH-FAN","Bath Fan",                     30.97, 0,    10),
            ("C","Exhaust Runs","BATH-EXH","Bath Exhaust",                 62.37, 0,    20),
            ("C","Exhaust Runs","KITCH-EXH","Kitchen Exhaust",             56.65, 0,    30),
            ("C","Exhaust Runs","DRYER-VENT","Dryer Vent",                 89.10, 0,    40),
            # ── D: Class B Flues ─────────────────────────────────────
            ("D","Class B Flues","4\" B-VENT","4\" Class B Flue",           9.83, 0,   10),
            ("D","Class B Flues","5\" B-VENT","5\" Class B Flue",          11.78, 0,   20),
            ("D","Class B Flues","6\" B-VENT","6\" Class B Flue",          19.54, 0,   30),
            # ── E: B Vent Connectors ─────────────────────────────────
            ("E","B Vent Connectors","CONN-1","B Vent Connector Type 1",  121.08, 0,   10),
            ("E","B Vent Connectors","CONN-2","B Vent Connector Type 2",  129.88, 0,   20),
            ("E","B Vent Connectors","CONN-3","B Vent Connector Type 3",  130.71, 0,   30),
            ("E","B Vent Connectors","CONN-4","B Vent Connector Type 4",  183.45, 0,   40),
            # ── F: Combustion Air ────────────────────────────────────
            ("F","Combustion Air","COMB-AIR","Combustion Air Kit",         31.88, 0,   10),
            # ── G: PVC Flues ─────────────────────────────────────────
            ("G","PVC Flues","PVC2X21DP","2\" Dual Pipe \u00d7 21\'",     139.29, 0,   10),
            ("G","PVC Flues","PVC2X31DP","2\" Dual Pipe \u00d7 31\'",     151.20, 0,   20),
            ("G","PVC Flues","PVC2X41DP","2\" Dual Pipe \u00d7 41\'",     164.91, 0,   30),
            ("G","PVC Flues","PVC3X21DP","3\" Dual Pipe \u00d7 21\'",     193.13, 0,   40),
            ("G","PVC Flues","PVC3X31DP","3\" Dual Pipe \u00d7 31\'",     220.99, 0,   50),
            ("G","PVC Flues","PVC3X41DP","3\" Dual Pipe \u00d7 41\'",     253.70, 0,   60),
            # ── H: Condensate Drain ──────────────────────────────────
            ("H","Condensate Drain","COND-DRAIN","Condensate Drain",       12.92, 0,   10),
            ("H","Condensate Drain","COND-PUMP-UP","Condensate Pump-Up",   39.11, 0,   20),
            # ── I: Condensate Pump ───────────────────────────────────
            ("I","Condensate Pump","COND-PUMP","Condensate Pump",         139.03, 0,   10),
            # ── J: Control Wiring ────────────────────────────────────
            ("J","Control Wiring","CTRL-WIRE","Control Wiring Kit",        46.76, 0,   10),
            # ── K: Copper Line Sets (per foot) ───────────────────────
            ("K","Copper Line Sets","COPPER-LS","Copper Line Set",          5.43, 0,   10),
            # ── L: Equipment Mounting Kits ───────────────────────────
            ("L","Equipment Mounting Kits","EMKV-1","Mounting Kit \u2014 Vertical 31\u00d731", 51.56, 0, 10),
            ("L","Equipment Mounting Kits","EMKV-2","Mounting Kit \u2014 Vertical (large)",    53.59, 0, 20),
            ("L","Equipment Mounting Kits","EMKH", "Mounting Kit \u2014 Horizontal",           61.85, 0, 30),
            # ── M: Humidifiers ───────────────────────────────────────
            ("M","Humidifiers","HUM-BYPASS","Bypass Humidifier",          312.33, 0,   10),
            ("M","Humidifiers","HUM-POWER","Power Humidifier",            424.22, 0,   20),
            # ── N: Air Cleaners ──────────────────────────────────────
            ("N","Air Cleaners","AC-1","Air Cleaner \u2014 Type 1",       161.10, 0,   10),
            ("N","Air Cleaners","AC-2","Air Cleaner \u2014 Type 2",       245.80, 0,   20),
            ("N","Air Cleaners","AC-3","Air Cleaner \u2014 Type 3",       398.50, 0,   30),
            ("N","Air Cleaners","AC-4","Air Cleaner \u2014 Type 4",       512.00, 0,   40),
            ("N","Air Cleaners","AC-5","Air Cleaner \u2014 Type 5",       784.25, 0,   50),
            ("N","Air Cleaners","AC-6","Air Cleaner \u2014 HEPA",        1122.96, 0,   60),
            # ── O: Energy Recovery Ventilator ────────────────────────
            ("O","Energy Recovery Ventilator","ERV","Energy Recovery Ventilator", 2350.11, 0, 10),
            # ── P: Duct Sealing ──────────────────────────────────────
            ("P","Duct Sealing","MASTIC-PKG","Mastic Duct Sealing Package", 70.00, 0,  10),
            # ── Q: Laundry Chutes ────────────────────────────────────
            ("Q","Laundry Chutes","LAUNDRY","Laundry Chute Kit",           85.00, 0,   10),
            # ── R: Fresh-Air ─────────────────────────────────────────
            ("R","Fresh-Air","FRESH-AIR","Fresh-Air Damper & Insulated Duct", 125.00, 0, 10),
            # ── S: Transfer Grill ────────────────────────────────────
            ("S","Transfer Grill","XFER-GRILL","Transfer Grill w/ Hexacomb", 55.00, 0, 10),
            # ── T: Zone Control Dampers ──────────────────────────────
            ("T","Zone Control Dampers","APR-2Z","Aprilaire \u2014 2 Zone",  890.84, 0, 10),
            ("T","Zone Control Dampers","APR-3Z","Aprilaire \u2014 3 Zone", 1304.95, 0, 20),
            ("T","Zone Control Dampers","APR-4Z","Aprilaire \u2014 4 Zone", 1364.86, 0, 30),
            ("T","Zone Control Dampers","APR-5Z","Aprilaire \u2014 5 Zone", 1742.76, 0, 40),
            ("T","Zone Control Dampers","EWC-2Z","EWC \u2014 2 Zone",      1503.49, 0, 50),
            ("T","Zone Control Dampers","EWC-3Z","EWC \u2014 3 Zone",      2077.46, 0, 60),
            ("T","Zone Control Dampers","EWC-4Z","EWC \u2014 4 Zone",      2664.17, 0, 70),
        ]

        for cat_code, cat_name, v_code, v_name, per_kit, per_foot, sort in VARIANTS:
            db.add(KitVariant(
                category_code=cat_code, category_name=cat_name,
                variant_code=v_code,   variant_name=v_name,
                per_kit=per_kit,       per_foot=per_foot,
                sort_order=sort,       active=True,
            ))
        db.commit()
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
