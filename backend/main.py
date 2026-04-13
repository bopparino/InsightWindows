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
        # v2.3 — rename pricing_flag -> category_code; sort_order VARCHAR -> INTEGER
        """DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='line_items' AND column_name='pricing_flag') THEN
                ALTER TABLE line_items RENAME COLUMN pricing_flag TO category_code;
            END IF;
        END $$""",
        """DO $$ BEGIN
            IF (SELECT data_type FROM information_schema.columns
                WHERE table_name='line_items' AND column_name='sort_order') = 'character varying' THEN
                ALTER TABLE line_items ALTER COLUMN sort_order TYPE INTEGER
                USING NULLIF(TRIM(sort_order::text), '')::INTEGER;
            END IF;
        END $$""",
        # v2.4 — price audit trail on kit variants
        "ALTER TABLE kit_variants ADD COLUMN IF NOT EXISTS price_updated_at TIMESTAMP",
        # v2.5 — FK indexes on high-traffic join columns
        "CREATE INDEX IF NOT EXISTS ix_projects_builder_id       ON projects(builder_id)",
        "CREATE INDEX IF NOT EXISTS ix_projects_county_id        ON projects(county_id)",
        "CREATE INDEX IF NOT EXISTS ix_house_types_plan_id       ON house_types(plan_id)",
        "CREATE INDEX IF NOT EXISTS ix_systems_house_type_id     ON systems(house_type_id)",
        "CREATE INDEX IF NOT EXISTS ix_systems_equip_system_id   ON systems(equipment_system_id)",
        "CREATE INDEX IF NOT EXISTS ix_line_items_system_id      ON line_items(system_id)",
        "CREATE INDEX IF NOT EXISTS ix_line_items_kit_variant_id ON line_items(kit_variant_id)",
        "CREATE INDEX IF NOT EXISTS ix_draws_house_type_id       ON draws(house_type_id)",
        "CREATE INDEX IF NOT EXISTS ix_event_log_plan_id         ON event_log(plan_id)",
        "CREATE INDEX IF NOT EXISTS ix_lic_kit_component_id      ON line_item_components(kit_component_id)",
        "CREATE INDEX IF NOT EXISTS ix_suggestions_user_id       ON suggestions(user_id)",
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
    from db.seed_data.kit_variants_data import VARIANTS
    db = SessionLocal()
    try:

        # Build lookup of existing records by variant_code for upsert
        existing = {v.variant_code: v for v in db.query(KitVariant).all()}
        added = updated = 0

        import datetime as _dt
        now = _dt.datetime.utcnow()
        for cat_code, cat_name, v_code, v_name, per_kit, per_foot, sort in VARIANTS:
            if v_code in existing:
                row = existing[v_code]
                price_changed = float(row.per_kit) != per_kit or float(row.per_foot) != per_foot
                row.category_name = cat_name
                row.variant_name  = v_name
                row.per_kit       = per_kit
                row.per_foot      = per_foot
                row.sort_order    = sort
                if price_changed:
                    row.price_updated_at = now
                updated += 1
            else:
                db.add(KitVariant(
                    category_code=cat_code, category_name=cat_name,
                    variant_code=v_code,   variant_name=v_name,
                    per_kit=per_kit,       per_foot=per_foot,
                    sort_order=sort,       active=True,
                    price_updated_at=now,
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
    from sqlalchemy import text as _text

    def ins(cat_code, cat_name, v_code, v_name, per_kit, per_foot, sort, divisor=1.0):
        return _text("""INSERT INTO kit_variants
            (category_code,category_name,variant_code,variant_name,per_kit,per_foot,markup_divisor,sort_order,active)
            SELECT :cat_code,:cat_name,:v_code,:v_name,:per_kit,:per_foot,:divisor,:sort,TRUE
            WHERE NOT EXISTS (SELECT 1 FROM kit_variants WHERE variant_code=:v_code)""").bindparams(
            cat_code=cat_code, cat_name=cat_name, v_code=v_code, v_name=v_name,
            per_kit=per_kit, per_foot=per_foot, divisor=divisor, sort=sort)

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
            stmt = sql if hasattr(sql, 'bindparams') else __import__("sqlalchemy").text(sql)
            conn.execute(stmt)
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
    from db.seed_data.kit_components_data import COMPONENT_SEED
    db = SessionLocal()
    try:

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


import logging as _logging
_logger = _logging.getLogger(__name__)

app = FastAPI(
    title="HVAC Bid System",
    version="1.0.0",
)

from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def _global_exception_handler(request: Request, exc: Exception):
    _logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
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
