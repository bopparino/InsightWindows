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
    PlanComment, PlanTask,
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
