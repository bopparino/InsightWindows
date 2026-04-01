"""
Demo seed script — run once to populate builders, counties, projects, and plans.
Usage (from backend folder with venv active):
    python seed_demo.py
"""
import random
import sys
import os
from datetime import date, datetime, timedelta

# Ensure the backend directory is on the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.database import SessionLocal
from models.models import Builder, County, Project, Plan

# ── Builders ──────────────────────────────────────────────────────────────────

BUILDERS = [
    # National
    ("NVR001", "NVR / Ryan Homes",          "Tom Halley",     "301-555-0100", "MD"),
    ("NVR002", "NVR / NVHomes",             "Sandra Kline",   "301-555-0101", "VA"),
    ("PHM001", "Pulte Homes",               "Greg Navarro",   "703-555-0110", "VA"),
    ("PHM002", "Pulte / Del Webb",          "Carol Sutton",   "302-555-0111", "DE"),
    ("DHI001", "D.R. Horton",               "Mike Eason",     "410-555-0120", "MD"),
    ("DHI002", "D.R. Horton — Express",     "Pat Rollins",    "717-555-0121", "PA"),
    ("LEN001", "Lennar Homes",              "Diana Walsh",    "703-555-0130", "VA"),
    ("LEN002", "Lennar — EI Homes",         "Frank Boone",    "410-555-0131", "MD"),
    ("TOL001", "Toll Brothers",             "Janet Pryor",    "610-555-0140", "PA"),
    ("TOL002", "Toll Brothers — TBI",       "Rich Dalton",    "703-555-0141", "VA"),
    ("KHO001", "K. Hovnanian Homes",        "Stacy Reeves",   "302-555-0150", "DE"),
    ("STD001", "Stanley Martin Homes",      "Alan George",    "703-555-0160", "VA"),
    ("STD002", "Stanley Martin — MD",       "Beth Ingram",    "301-555-0161", "MD"),
    ("MIL001", "Miller & Smith",            "Clay Norton",    "703-555-0170", "VA"),
    ("EYA001", "EYA",                       "Dana Soto",      "301-555-0180", "MD"),
    ("MCK001", "McKinley Homes",            "Earl Vance",     "410-555-0190", "MD"),
    ("SHE001", "Shea Homes",               "Fiona Cross",    "703-555-0200", "VA"),
    ("RIC001", "Richmond American Homes",   "Gabe Marsh",     "717-555-0210", "PA"),
    ("MRD001", "Meritage Homes",            "Holly Quinn",    "703-555-0220", "VA"),
    ("CEN001", "Century Communities",       "Ivan Parks",     "301-555-0230", "MD"),
    # MD Regional
    ("CHB001", "Chesapeake Builders",       "Jack Medina",    "410-555-0300", "MD"),
    ("BAY001", "Bay Country Homes",         "Karen Field",    "410-555-0301", "MD"),
    ("CAL001", "Calvert Custom Homes",      "Larry Moon",     "301-555-0302", "MD"),
    ("MDL001", "Maryland Land & Home",      "Megan Stone",    "301-555-0303", "MD"),
    ("FRE001", "Frederick Builders Group",  "Neil Curry",     "301-555-0304", "MD"),
    ("ANN001", "Annapolis Homes",           "Olivia Sharp",   "410-555-0305", "MD"),
    ("EAS001", "Eastern Shore Builders",    "Paul Dixon",     "410-555-0306", "MD"),
    ("SLM001", "Southern Maryland Const.",  "Quinn Ellis",    "301-555-0307", "MD"),
    ("MGM001", "Montgomery Custom Homes",   "Rosa Ford",      "301-555-0308", "MD"),
    ("PGC001", "Prince George's Builders",  "Sam Grant",      "301-555-0309", "MD"),
    ("HAR001", "Harford County Homes",      "Tina Hayes",     "410-555-0310", "MD"),
    ("HOW001", "Howard County Builders",    "Uma Irwin",      "410-555-0311", "MD"),
    ("BAL001", "Baltimore Metro Builders",  "Victor James",   "410-555-0312", "MD"),
    ("WOR001", "Worcester County Homes",    "Wendy Klein",    "410-555-0313", "MD"),
    ("CAR001", "Carroll County Const.",     "Xena Lyons",     "410-555-0314", "MD"),
    # VA Regional
    ("NOV001", "Northern VA Builders",      "Yara Mason",     "703-555-0400", "VA"),
    ("FAI001", "Fairfax Custom Homes",      "Zach Nelson",    "703-555-0401", "VA"),
    ("LOC001", "Loudoun County Builders",   "Amy Owens",      "571-555-0402", "VA"),
    ("PWC001", "Prince William Builders",   "Brad Page",      "703-555-0403", "VA"),
    ("SHN001", "Shenandoah Homes",         "Cara Quinn",     "540-555-0404", "VA"),
    ("RKB001", "Rockbridge Builders",       "Dave Reed",      "540-555-0405", "VA"),
    ("RIC002", "Richmond Metro Const.",     "Eve Scott",      "804-555-0406", "VA"),
    ("VBH001", "Virginia Beach Homes",      "Fred Taylor",    "757-555-0407", "VA"),
    ("STA001", "Stafford County Builders",  "Gina Upton",     "540-555-0408", "VA"),
    ("WAR001", "Warren County Homes",       "Hank Vance",     "540-555-0409", "VA"),
    ("CLK001", "Clarke County Builders",    "Iris White",     "540-555-0410", "VA"),
    ("RPN001", "Rappahannock Homes",        "Joel Xiong",     "540-555-0411", "VA"),
    # PA Regional
    ("LAN001", "Lancaster County Builders", "Kate Young",     "717-555-0500", "PA"),
    ("CHE001", "Chester County Homes",      "Leo Zimmer",     "610-555-0501", "PA"),
    ("DEL001", "Delaware County Builders",  "Mia Adams",      "610-555-0502", "PA"),
    ("YRK001", "York County Homes",         "Ned Baker",      "717-555-0503", "PA"),
    ("DAU001", "Dauphin County Const.",     "Ora Carroll",    "717-555-0504", "PA"),
    ("CUM001", "Cumberland Valley Homes",   "Pete Davis",     "717-555-0505", "PA"),
    ("ADM001", "Adams County Builders",     "Rae Evans",      "717-555-0506", "PA"),
    ("BER001", "Berks County Homes",        "Stan Foster",    "610-555-0507", "PA"),
    ("LHI001", "Lehigh Valley Builders",    "Tara Green",     "610-555-0508", "PA"),
    ("MON001", "Montgomery County Homes",   "Ursula Hall",    "610-555-0509", "PA"),
    # DE Regional
    ("NCC001", "New Castle County Builders","Victor Ingram",  "302-555-0600", "DE"),
    ("KEN001", "Kent County Homes",         "Wanda Jensen",   "302-555-0601", "DE"),
    ("SUS001", "Sussex County Builders",    "Xavier King",    "302-555-0602", "DE"),
    ("BEA001", "Bethany Beach Homes",       "Yolanda Lee",    "302-555-0603", "DE"),
    ("REH001", "Rehoboth Bay Builders",     "Zach Moore",     "302-555-0604", "DE"),
    ("MIL002", "Milford Area Homes",        "Amy Nash",       "302-555-0605", "DE"),
    ("DOV001", "Dover Custom Builders",     "Bill Olsen",     "302-555-0606", "DE"),
    ("WIL001", "Wilmington Metro Homes",    "Cindy Park",     "302-555-0607", "DE"),
    ("SEA001", "Seaside Delaware Builders", "Don Quinn",      "302-555-0608", "DE"),
    ("DEL002", "Delaware Coastal Homes",    "Ellen Ross",     "302-555-0609", "DE"),
]

# ── Counties ──────────────────────────────────────────────────────────────────

COUNTIES = [
    # MD
    ("MD-ANN", "Anne Arundel",   "MD"),
    ("MD-BAL", "Baltimore",      "MD"),
    ("MD-CAL", "Calvert",        "MD"),
    ("MD-CAR", "Carroll",        "MD"),
    ("MD-CEC", "Cecil",          "MD"),
    ("MD-CHA", "Charles",        "MD"),
    ("MD-FRE", "Frederick",      "MD"),
    ("MD-HAR", "Harford",        "MD"),
    ("MD-HOW", "Howard",         "MD"),
    ("MD-MGM", "Montgomery",     "MD"),
    ("MD-PGC", "Prince George's","MD"),
    ("MD-SMY", "St. Mary's",     "MD"),
    ("MD-WOR", "Worcester",      "MD"),
    # VA
    ("VA-FAI", "Fairfax",        "VA"),
    ("VA-LOU", "Loudoun",        "VA"),
    ("VA-PWC", "Prince William", "VA"),
    ("VA-STA", "Stafford",       "VA"),
    ("VA-SPO", "Spotsylvania",   "VA"),
    ("VA-WAR", "Warren",         "VA"),
    ("VA-CLK", "Clarke",         "VA"),
    ("VA-FRE", "Frederick",      "VA"),
    ("VA-RCK", "Rockingham",     "VA"),
    # PA
    ("PA-LAN", "Lancaster",      "PA"),
    ("PA-CHE", "Chester",        "PA"),
    ("PA-YRK", "York",           "PA"),
    ("PA-DAU", "Dauphin",        "PA"),
    ("PA-CUM", "Cumberland",     "PA"),
    ("PA-BER", "Berks",          "PA"),
    ("PA-MON", "Montgomery",     "PA"),
    # DE
    ("DE-NCC", "New Castle",     "DE"),
    ("DE-KEN", "Kent",           "DE"),
    ("DE-SUS", "Sussex",         "DE"),
]

# ── Project name parts ────────────────────────────────────────────────────────

COMMUNITIES = [
    "The Reserve at", "Villages of", "Estates at", "Meadows at", "Preserve at",
    "Overlook at", "Springs at", "Crossing at", "Highlands at", "Arbors at",
    "Glen at", "Ridge at", "Shores of", "Landings at", "Pointe at",
    "Commons at", "Vistas at", "Bluffs at", "Pines at", "Waters Edge at",
]

PLACE_NAMES = [
    "Cedar Creek", "Maple Run", "Stone Bridge", "River Bend", "Fox Chase",
    "Elk Ridge", "White Oak", "Rolling Hills", "Twin Oaks", "Heritage Farm",
    "Willowbrook", "Chestnut Hill", "Silver Spring", "Clover Field", "Mill Creek",
    "Blue Ridge", "Green Valley", "Long Meadow", "Stony Brook", "Timber Ridge",
    "Ironbridge", "Sugarloaf", "Catoctin", "Patuxent", "Chesapeake Bay",
    "Shenandoah", "Seneca", "Antietam", "Monocacy", "Potomac",
]

HOUSE_TYPES = [
    "Colonial", "Craftsman", "Traditional", "Contemporary", "Ranch",
    "Split Level", "Cape Cod", "Townhome", "Villa", "Carriage Home",
]

STATUSES = ["draft", "draft", "proposed", "proposed", "contracted", "contracted", "complete", "lost"]

ESTIMATORS = [
    ("Austin Cantrell", "AC"),
    ("James Porter",    "JP"),
    ("Dana Mills",      "DM"),
]


def run():
    db = SessionLocal()
    try:
        # ── Counties ──────────────────────────────────────────────────────────
        print("Seeding counties...")
        county_map = {}
        for code, name, state in COUNTIES:
            existing = db.query(County).filter_by(code=code).first()
            if not existing:
                c = County(code=code, name=name, state=state)
                db.add(c)
                db.flush()
                county_map[code] = c.id
            else:
                county_map[code] = existing.id
        db.commit()
        print(f"  {len(COUNTIES)} counties ready")

        # Re-fetch county IDs after commit
        all_counties = db.query(County).all()
        county_ids_by_state = {}
        for c in all_counties:
            county_ids_by_state.setdefault(c.state, []).append(c.id)

        # ── Builders ──────────────────────────────────────────────────────────
        print("Seeding builders...")
        builder_ids = []
        builder_states = {}
        for code, name, contact, phone, state in BUILDERS:
            existing = db.query(Builder).filter_by(code=code).first()
            if not existing:
                b = Builder(
                    code=code, name=name, contact_name=contact,
                    office_phone=phone, state=state,
                    email=f"{code.lower()}@example.com", active=True,
                )
                db.add(b)
                db.flush()
                builder_ids.append(b.id)
                builder_states[b.id] = state
            else:
                builder_ids.append(existing.id)
                builder_states[existing.id] = existing.state
        db.commit()
        print(f"  {len(BUILDERS)} builders ready")

        # ── Projects ──────────────────────────────────────────────────────────
        print("Seeding projects...")
        project_ids = []
        used_proj_codes = set()
        target_projects = 90

        attempts = 0
        while len(project_ids) < target_projects and attempts < 500:
            attempts += 1
            builder_id = random.choice(builder_ids)
            state = builder_states[builder_id]
            county_pool = county_ids_by_state.get(state, list(county_ids_by_state.values())[0])
            county_id = random.choice(county_pool)

            community = random.choice(COMMUNITIES)
            place = random.choice(PLACE_NAMES)
            name = f"{community} {place}"
            seq = len(project_ids) + 1
            code = f"P{seq:04d}"
            if code in used_proj_codes:
                continue
            used_proj_codes.add(code)

            p = Project(code=code, name=name, builder_id=builder_id,
                        county_id=county_id, active=True)
            db.add(p)
            db.flush()
            project_ids.append(p.id)

        db.commit()
        print(f"  {len(project_ids)} projects ready")

        # ── Plans ─────────────────────────────────────────────────────────────
        print("Seeding plans...")
        target_plans = 200
        used_plan_numbers = set()

        base_date = datetime.now() - timedelta(days=730)

        for i in range(target_plans):
            project_id = random.choice(project_ids)
            estimator_name, estimator_initials = random.choice(ESTIMATORS)
            status = random.choice(STATUSES)

            created_at = base_date + timedelta(days=random.randint(0, 700))
            contracted_at = None
            if status in ("contracted", "complete"):
                contracted_at = created_at + timedelta(days=random.randint(7, 60))

            house_type = random.choice(HOUSE_TYPES)
            zones = random.randint(1, 3)

            seq = i + 1
            plan_number = f"{estimator_initials}{seq:05d}"
            if plan_number in used_plan_numbers:
                plan_number = f"{estimator_initials}{seq:05d}X"
            used_plan_numbers.add(plan_number)

            plan = Plan(
                plan_number=plan_number,
                estimator_name=estimator_name,
                estimator_initials=estimator_initials,
                project_id=project_id,
                status=status,
                number_of_zones=zones,
                house_type=house_type,
                notes=None,
                contracted_at=contracted_at,
                created_at=created_at,
            )
            db.add(plan)

        db.commit()
        print(f"  {target_plans} plans ready")
        print("\nDone! Database seeded successfully.")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
