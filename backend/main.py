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
