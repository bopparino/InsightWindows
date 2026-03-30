"""
Legacy data import script.
Imports Builder.xlsx, Project.xlsx, Part.xlsx, and Bidsheet.xlsx
into the PostgreSQL hvac_poc database.

Run from backend directory:
    .venv/Scripts/python.exe scripts/import_legacy.py
"""
import sys
import datetime
import openpyxl
import psycopg2
from psycopg2.extras import execute_values

DB_DSN = "postgresql://postgres:bullet@localhost:5432/hvac_poc"
FILES  = {
    "builders": "../downloadedfiles/Builder.xlsx",
    "projects": "../downloadedfiles/Project.xlsx",
    "parts":    "../downloadedfiles/Part.xlsx",
    "bidsheet": "../downloadedfiles/Bidsheet.xlsx",
}

def load_sheet(path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    wb.close()
    headers = [str(h).strip().upper() if h else "" for h in rows[0]]
    data = rows[1:]
    return headers, data

def col(headers, name):
    return headers.index(name)

def clean(v):
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None

#--───────────────────────────────────────────
# 1. BUILDERS
#--───────────────────────────────────────────
def import_builders(cur):
    print("\n-- Builders --")
    headers, data = load_sheet(FILES["builders"])

    inserted = updated = skipped = 0
    for row in data:
        if not row[col(headers, "BUILD_CODE")]:
            continue
        if str(row[col(headers, "STATUSFLAG")] or "").strip().upper() == "CO":
            skipped += 1
            continue

        code     = clean(row[col(headers, "BUILD_CODE")])
        name     = clean(row[col(headers, "BUILD_NAME")]) or code
        address  = clean(row[col(headers, "ADDRESS")])
        city     = clean(row[col(headers, "CITY")])
        state    = clean(row[col(headers, "STATE")])
        zip_code = clean(row[col(headers, "ZIP_CODE")])
        phone    = clean(row[col(headers, "PHONE_NBR")])
        contact  = clean(row[col(headers, "PRIM_CONT")])
        cell     = clean(row[col(headers, "CONT_PHONE")])

        cur.execute("""
            INSERT INTO builders (code, name, address, city, state, zip_code,
                                  office_phone, contact_name, cell_phone, active)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s, true)
            ON CONFLICT (code) DO UPDATE SET
                name=EXCLUDED.name, address=EXCLUDED.address, city=EXCLUDED.city,
                state=EXCLUDED.state, zip_code=EXCLUDED.zip_code,
                office_phone=EXCLUDED.office_phone, contact_name=EXCLUDED.contact_name,
                cell_phone=EXCLUDED.cell_phone
            RETURNING (xmax = 0) AS inserted
        """, (code, name, address, city, state, zip_code, phone, contact, cell))
        was_inserted = cur.fetchone()[0]
        if was_inserted:
            inserted += 1
        else:
            updated += 1

    print(f"  inserted={inserted}  updated={updated}  skipped(CO)={skipped}")

#--───────────────────────────────────────────
# 2. PROJECTS
#--───────────────────────────────────────────
def import_projects(cur):
    print("\n-- Projects--")
    headers, data = load_sheet(FILES["projects"])

    # Build builder code → id map
    cur.execute("SELECT code, id FROM builders")
    builder_map = {r[0]: r[1] for r in cur.fetchall()}

    inserted = updated = skipped = 0
    missing_builders = set()

    for row in data:
        if not row[col(headers, "PROJ_CODE")]:
            continue
        if str(row[col(headers, "STATUSFLAG")] or "").strip().upper() != "Y":
            skipped += 1
            continue

        proj_code    = clean(row[col(headers, "PROJ_CODE")])
        proj_name    = clean(row[col(headers, "PROJ_NAME")]) or proj_code
        build_code   = clean(row[col(headers, "BUILD_CODE")])

        builder_id = builder_map.get(build_code)
        if builder_id is None:
            missing_builders.add(build_code)
            skipped += 1
            continue

        cur.execute("""
            INSERT INTO projects (code, name, builder_id, active)
            VALUES (%s,%s,%s, true)
            ON CONFLICT (code) DO UPDATE SET
                name=EXCLUDED.name, builder_id=EXCLUDED.builder_id
            RETURNING (xmax = 0) AS inserted
        """, (proj_code, proj_name, builder_id))
        was_inserted = cur.fetchone()[0]
        if was_inserted:
            inserted += 1
        else:
            updated += 1

    print(f"  inserted={inserted}  updated={updated}  skipped={skipped}")
    if missing_builders:
        sorted_missing = sorted(str(x) for x in missing_builders)
        print(f"  missing builder codes ({len(missing_builders)}): {sorted_missing[:10]}{'...' if len(missing_builders)>10 else ''}")

#--───────────────────────────────────────────
# 3. PARTS (equipment systems)
#--───────────────────────────────────────────
EQP_TYPE_MAP = {
    # EQP_TYPE code → manufacturer name fragment to match in equipment_manufacturers
    "OD":  "Carrier",       # outdoor unit — use Carrier as default
    "ID":  "Carrier",       # indoor unit
    "AC":  "Carrier",       # air conditioning
    "HP":  "Comfortmaker",  # heat pump
    "HT":  "Comfortmaker",  # heating
    "CL":  "Daikin",        # cooling
    "FU":  "Comfortmaker",  # furnace
    "AH":  "Carrier",       # air handler
    "FK":  "Carrier",       # misc kit
}

def import_parts(cur):
    print("\n-- Parts / Equipment Systems--")
    headers, data = load_sheet(FILES["parts"])

    # Build manufacturer name → id map
    cur.execute("SELECT name, id FROM equipment_manufacturers")
    mfr_by_name = {r[0]: r[1] for r in cur.fetchall()}

    # Default manufacturer for unmapped types
    default_mfr_id = next(iter(mfr_by_name.values()))

    def get_mfr_id(eqp_type):
        hint = EQP_TYPE_MAP.get(str(eqp_type or "").strip().upper())
        if hint:
            for name, mid in mfr_by_name.items():
                if hint.lower() in name.lower():
                    return mid
        return default_mfr_id

    today = datetime.date.today()
    inserted = skipped = 0

    for row in data:
        part_nbr = clean(row[col(headers, "PART_NBR")])
        desc     = clean(row[col(headers, "DESC")])
        if not part_nbr or not desc:
            skipped += 1
            continue

        eqp_type = clean(row[col(headers, "EQP_TYPE")])
        mfr_id   = get_mfr_id(eqp_type)

        # PART_COST / A_COST might have pricing info
        part_cost = row[col(headers, "PART_COST")]
        a_cost    = row[col(headers, "A_COST")]
        try:
            component_cost = float(part_cost) if part_cost is not None else 0.0
        except (TypeError, ValueError):
            component_cost = 0.0
        try:
            bid_price = float(a_cost) if a_cost is not None else 0.0
        except (TypeError, ValueError):
            bid_price = 0.0

        cur.execute("""
            INSERT INTO equipment_systems
                (manufacturer_id, system_code, description, component_cost, bid_price, effective_date)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """, (mfr_id, part_nbr, desc, component_cost, bid_price, today))
        inserted += 1

    print(f"  inserted(attempted)={inserted}  skipped(no data)={skipped}")

#--───────────────────────────────────────────
# 4. BIDSHEET (historical plans)
#--───────────────────────────────────────────
LEGACY_BUILDER_CODE  = "LEGACY"
LEGACY_BUILDER_NAME  = "Legacy Import"
LEGACY_PROJECT_CODE  = "LEGACYBID"
LEGACY_PROJECT_NAME  = "Legacy Bids (Pre-System)"
LEGACY_ESTIMATOR     = "Legacy Import"
LEGACY_INITIALS      = "LI"

def get_or_create_legacy_project(cur):
    # Ensure LEGACY builder exists
    cur.execute("""
        INSERT INTO builders (code, name, active)
        VALUES (%s, %s, false)
        ON CONFLICT (code) DO NOTHING
    """, (LEGACY_BUILDER_CODE, LEGACY_BUILDER_NAME))

    cur.execute("SELECT id FROM builders WHERE code=%s", (LEGACY_BUILDER_CODE,))
    builder_id = cur.fetchone()[0]

    # Ensure LEGACY project exists
    cur.execute("""
        INSERT INTO projects (code, name, builder_id, active)
        VALUES (%s, %s, %s, false)
        ON CONFLICT (code) DO NOTHING
    """, (LEGACY_PROJECT_CODE, LEGACY_PROJECT_NAME, builder_id))

    cur.execute("SELECT id FROM projects WHERE code=%s", (LEGACY_PROJECT_CODE,))
    return cur.fetchone()[0]


def import_bidsheet(cur):
    print("\n-- Bidsheet (historical plans)--")
    headers, data = load_sheet(FILES["bidsheet"])

    legacy_proj_id = get_or_create_legacy_project(cur)

    # Check existing plan numbers to avoid re-importing
    cur.execute("SELECT plan_number FROM plans")
    existing_plans = {r[0] for r in cur.fetchall()}

    # Group rows by PLAN_NBR, keep only KEEP='Y' rows
    plan_rows = {}
    for row in data:
        plan_nbr = clean(row[col(headers, "PLAN_NBR")])
        if not plan_nbr:
            continue
        keep = str(row[col(headers, "KEEP")] or "").strip().upper()
        if keep != "Y":
            continue
        if plan_nbr not in plan_rows:
            plan_rows[plan_nbr] = []
        plan_rows[plan_nbr].append(row)

    inserted = skipped = 0

    for plan_nbr, rows in plan_rows.items():
        if plan_nbr in existing_plans:
            skipped += 1
            continue

        # Aggregate across rows for the same plan
        total_bid = 0.0
        house_type = None
        created_at = None

        for row in rows:
            ft = row[col(headers, "FINALTOT")]
            try:
                total_bid += float(ft) if ft is not None else 0.0
            except (TypeError, ValueError):
                pass

            if house_type is None:
                ht = clean(row[col(headers, "HOUSE_TYPE")])
                if ht:
                    house_type = ht

            if created_at is None:
                ed = row[col(headers, "EDIT_DATE")]
                if isinstance(ed, datetime.datetime):
                    created_at = ed
                elif isinstance(ed, datetime.date):
                    created_at = datetime.datetime(ed.year, ed.month, ed.day)

        if created_at is None:
            created_at = datetime.datetime(2000, 1, 1)

        # Determine number of zones from row count (each row = one house number/zone)
        number_of_zones = len(rows)

        # Insert plan
        cur.execute("""
            INSERT INTO plans
                (plan_number, estimator_name, estimator_initials, project_id,
                 status, number_of_zones, house_type, created_at, updated_at)
            VALUES (%s, %s, %s, %s, 'complete', %s, %s, %s, %s)
            ON CONFLICT (plan_number) DO NOTHING
            RETURNING id
        """, (
            plan_nbr, LEGACY_ESTIMATOR, LEGACY_INITIALS, legacy_proj_id,
            number_of_zones, house_type, created_at, created_at
        ))
        result = cur.fetchone()
        if result is None:
            skipped += 1
            continue

        plan_id = result[0]

        # Insert a single HouseType summary row with the aggregated total_bid
        cur.execute("""
            INSERT INTO house_types (plan_id, house_number, name, total_bid)
            VALUES (%s, '01', %s, %s)
        """, (plan_id, house_type or plan_nbr, round(total_bid, 2) if total_bid else None))

        inserted += 1

    print(f"  inserted={inserted}  skipped(already exist or dupe)={skipped}")

#--───────────────────────────────────────────
# MAIN
#--───────────────────────────────────────────
def main():
    print("Connecting to database...")
    conn = psycopg2.connect(DB_DSN)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        import_builders(cur)
        import_projects(cur)
        import_parts(cur)
        import_bidsheet(cur)
        conn.commit()
        print("\nOK All imports committed successfully.")
    except Exception as e:
        conn.rollback()
        print(f"\nERROR Error during import, rolled back: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()
