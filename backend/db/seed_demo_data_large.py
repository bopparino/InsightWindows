"""
Seeds large demo dataset for a realistic-looking system.
Run after init_db.py and seed_admin.py:
    python db/seed_demo_data_large.py

Creates:
  - 50 builders (real DMV-area home builders)
  - 50 projects across MD/VA/DC
  - ~100 plans with mixed statuses spread over 18 months
  - Line items and draws on each plan
"""
import sys, os, random
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from core.database import SessionLocal, engine, Base
from models.models import (
    Builder, Project, Plan, HouseType,
    System, LineItem, Draw, EventLog, EquipmentSystem, User
)

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# ── Helpers ───────────────────────────────────────────────────

def rand_date(min_days, max_days):
    return datetime.now() - timedelta(days=random.randint(min_days, max_days))

def rand_phone(area="301"):
    return f"{area}-{random.randint(200,999)}-{random.randint(1000,9999)}"

# ── 1. Builders (50 — real DMV-area home builders) ───────────

print("Creating 50 DMV-area builders...")

BUILDERS = [
    # (code, name, contact, city, state)
    ("BLD001", "Toll Brothers",                  "Mike Toll",          "Reston",           "VA"),
    ("BLD002", "NVR / Ryan Homes",               "Dan Saah",           "Reston",           "VA"),
    ("BLD003", "K. Hovnanian Homes",             "Steve Hovnanian",    "Laurel",           "MD"),
    ("BLD004", "Pulte Homes",                    "Craig Bowman",       "Fairfax",          "VA"),
    ("BLD005", "Beazer Homes",                   "Rich Moreno",        "Bowie",            "MD"),
    ("BLD006", "Stanley Martin Homes",           "Jeff Stanley",       "Reston",           "VA"),
    ("BLD007", "Dan Ryan Builders",              "Dan Ryan",           "Bethesda",         "MD"),
    ("BLD008", "Winchester Homes",               "Tony Natelli",       "Bethesda",         "MD"),
    ("BLD009", "Miller & Smith",                 "Bob Smith",          "McLean",           "VA"),
    ("BLD010", "Elm Street Development",         "A.J. Dwoskin",       "McLean",           "VA"),
    ("BLD011", "Brookfield Residential",         "Pat Benton",         "Reston",           "VA"),
    ("BLD012", "Van Metre Homes",                "Al Van Metre",       "Ashburn",          "VA"),
    ("BLD013", "Drees Homes",                    "David Drees",        "Silver Spring",    "MD"),
    ("BLD014", "Craftmark Homes",                "Carlos Silva",       "Rockville",        "MD"),
    ("BLD015", "Wormald Homes",                  "Jim Wormald",        "Frederick",        "MD"),
    ("BLD016", "Caruso Homes",                   "Nick Caruso",        "Crofton",          "MD"),
    ("BLD017", "Williamsburg Homes",             "Mark Williams",      "Annapolis",        "MD"),
    ("BLD018", "Mitchell & Best",                "Dave Mitchell",      "Rockville",        "MD"),
    ("BLD019", "Bachman Builders",               "Tom Bachman",        "Gaithersburg",     "MD"),
    ("BLD020", "Classic Homes of Maryland",      "Joe Alfandre",       "Clarksburg",       "MD"),
    ("BLD021", "Gambrill Gardens Homes",         "Steve Gambrill",     "Frederick",        "MD"),
    ("BLD022", "Keystone Custom Homes",          "Jeff Rutt",          "Hagerstown",       "MD"),
    ("BLD023", "Kettler",                        "Bob Kettler",        "McLean",           "VA"),
    ("BLD024", "Comstock Homes",                 "Chris Clemente",     "Reston",           "VA"),
    ("BLD025", "Peterson Companies",             "Jon Peterson",       "Fairfax",          "VA"),
    ("BLD026", "Paradigm Construction",          "Keith Ayers",        "Herndon",          "VA"),
    ("BLD027", "Tri Pointe Homes",               "Doug Bauer",         "Gainesville",      "VA"),
    ("BLD028", "Meritage Homes",                 "Steve Hilton",       "Manassas",         "VA"),
    ("BLD029", "Richmond American Homes",        "Larry Mizel",        "Woodbridge",       "VA"),
    ("BLD030", "MI Homes",                       "Bob Schottenstein",  "Bristow",          "VA"),
    ("BLD031", "Lennar",                         "Stuart Miller",      "Germantown",       "MD"),
    ("BLD032", "DR Horton",                      "Donald Horton",      "Waldorf",          "MD"),
    ("BLD033", "CalAtlantic Homes",              "Larry Nicholson",    "Centreville",      "VA"),
    ("BLD034", "Bozzuto Homes",                  "Tom Bozzuto",        "Greenbelt",        "MD"),
    ("BLD035", "Avendale Homes",                 "Greg Avendale",      "Potomac",          "MD"),
    ("BLD036", "Heritage Homes",                 "Bill Heritage",      "Leesburg",         "VA"),
    ("BLD037", "Charm City Builders",            "Marcus Thompson",    "Columbia",         "MD"),
    ("BLD038", "Chesapeake Homes",               "Rick Chesapeake",    "Easton",           "MD"),
    ("BLD039", "Potomac Crest Builders",         "Alan Crest",         "Great Falls",      "VA"),
    ("BLD040", "Sandy Spring Builders",          "Jim Peterson",       "Sandy Spring",     "MD"),
    ("BLD041", "Kingsbarns Development",         "Derek Kingsbarns",   "Bethesda",         "MD"),
    ("BLD042", "Monument Homes",                 "Sarah Monument",     "Arlington",        "VA"),
    ("BLD043", "Federal Hill Builders",          "Tony Marino",        "Severna Park",     "MD"),
    ("BLD044", "Capitol Custom Homes",           "Chris Walker",       "Alexandria",       "VA"),
    ("BLD045", "Liberty Homes Group",            "Paul Liberty",       "Chantilly",        "VA"),
    ("BLD046", "Sentry Building Group",          "Mike Sentry",        "Ellicott City",    "MD"),
    ("BLD047", "Tidewater Builders",             "Rob Tidewater",      "Annapolis",        "MD"),
    ("BLD048", "Meridian Homes",                 "Tom Meridian",       "Bethesda",         "MD"),
    ("BLD049", "Westbrook Homes",                "Mike Westbrook",     "Clarksburg",       "MD"),
    ("BLD050", "Ten Oaks Building Group",        "Chris Oaks",         "Clarksville",      "MD"),
]

builders = {}
for code, name, contact, city, state in BUILDERS:
    existing = db.query(Builder).filter_by(code=code).first()
    if existing:
        builders[code] = existing
        continue
    b = Builder(
        code=code, name=name,
        contact_name=contact, office_phone=rand_phone("301" if state == "MD" else "703"),
        email=f"{contact.split()[0].lower()}@{name.lower().replace(' ', '').replace('&', '').replace('.', '').replace(',', '')[:20]}.com",
        city=city, state=state,
        zip_code=f"{random.randint(20000, 22199):05d}",
    )
    db.add(b)
    db.flush()
    builders[code] = b

db.commit()
print(f"  {len(builders)} builders ready")

# ── 2. Projects (50 — real DMV neighborhoods / developments) ─

print("\nCreating 50 projects...")

PROJECTS = [
    # (code, name, builder_code)
    ("PRJ001", "CLARKSBURG VILLAGE",            "BLD001"),
    ("PRJ002", "CABIN BRANCH",                  "BLD002"),
    ("PRJ003", "ARORA HILLS",                   "BLD003"),
    ("PRJ004", "BRAMBLETON",                    "BLD004"),
    ("PRJ005", "MAPLE LAWN",                    "BLD005"),
    ("PRJ006", "EMBREY MILL",                   "BLD006"),
    ("PRJ007", "LANDSDALE",                     "BLD007"),
    ("PRJ008", "RIVER CREEK",                   "BLD008"),
    ("PRJ009", "WILLOWSFORD",                   "BLD009"),
    ("PRJ010", "ONE LOUDOUN",                   "BLD010"),
    ("PRJ011", "GREENDALE",                     "BLD011"),
    ("PRJ012", "THE PRESERVE AT ROCK CREEK",    "BLD012"),
    ("PRJ013", "TURF VALLEY",                   "BLD013"),
    ("PRJ014", "LAKE LINGANORE",                "BLD014"),
    ("PRJ015", "CLOVERLY",                      "BLD015"),
    ("PRJ016", "SEVEN OAKS",                    "BLD016"),
    ("PRJ017", "HERITAGE AT MILFORD MILL",      "BLD017"),
    ("PRJ018", "STONE RIDGE",                   "BLD018"),
    ("PRJ019", "GREENWAY VILLAGE",              "BLD019"),
    ("PRJ020", "URBANA HIGHLANDS",              "BLD020"),
    ("PRJ021", "BALLARD GREEN",                 "BLD021"),
    ("PRJ022", "RIDGE AT LINGANORE",            "BLD022"),
    ("PRJ023", "TYSONS CORNER",                 "BLD023"),
    ("PRJ024", "RESTON STATION",                "BLD024"),
    ("PRJ025", "MERRIFIELD",                    "BLD025"),
    ("PRJ026", "CASCADES",                      "BLD026"),
    ("PRJ027", "VIRGINIA MANOR",                "BLD027"),
    ("PRJ028", "VICTORY LAKES",                 "BLD028"),
    ("PRJ029", "BELMONT BAY",                   "BLD029"),
    ("PRJ030", "KINGSMILL ON THE JAMES",        "BLD030"),
    ("PRJ031", "KING FARM",                     "BLD031"),
    ("PRJ032", "FAIRWOOD",                      "BLD032"),
    ("PRJ033", "SOUTH RIDING",                  "BLD033"),
    ("PRJ034", "KONTERRA TOWN CENTER",          "BLD034"),
    ("PRJ035", "POTOMAC OVERLOOK",              "BLD035"),
    ("PRJ036", "RIVERSIDE AT LEESBURG",         "BLD036"),
    ("PRJ037", "COLUMBIA CROSSING",             "BLD037"),
    ("PRJ038", "EASTON VILLAGE",                "BLD038"),
    ("PRJ039", "GREAT FALLS ESTATES",           "BLD039"),
    ("PRJ040", "SANDY SPRING MEADOWS",          "BLD040"),
    ("PRJ041", "BETHESDA OVERLOOK",             "BLD041"),
    ("PRJ042", "ARLINGTON RIDGE",               "BLD042"),
    ("PRJ043", "SEVERNA PARK MANOR",            "BLD043"),
    ("PRJ044", "OLD TOWN TERRACE",              "BLD044"),
    ("PRJ045", "CHANTILLY CROSSING",            "BLD045"),
    ("PRJ046", "ELLICOTT PRESERVE",             "BLD046"),
    ("PRJ047", "ANNAPOLIS ROADS",               "BLD047"),
    ("PRJ048", "WYNHURST",                      "BLD048"),
    ("PRJ049", "CLARKSBURG CROSSING",           "BLD049"),
    ("PRJ050", "CLARKSVILLE RESERVE",           "BLD050"),
]

projects = {}
for code, name, builder_code in PROJECTS:
    existing = db.query(Project).filter_by(code=code).first()
    if existing:
        projects[code] = existing
        continue
    b = builders.get(builder_code)
    if not b:
        continue
    p = Project(code=code, name=name, builder_id=b.id)
    db.add(p)
    db.flush()
    projects[code] = p

db.commit()
print(f"  {len(projects)} projects ready")

# ── 3. Load equipment systems ────────────────────────────────

print("\nLoading equipment systems...")
eq_systems = db.query(EquipmentSystem).filter(
    EquipmentSystem.retired_date.is_(None)
).all()

GAS_SYSTEMS  = [s for s in eq_systems if "HP" not in s.system_code.upper()
                and any(x in s.system_code.upper() for x in ["CG","JG","RG","GG"])]
HEAT_PUMPS   = [s for s in eq_systems if "HP" in s.system_code.upper()]
ALL_SYSTEMS  = eq_systems

def pick_system():
    pool = random.choices([GAS_SYSTEMS, HEAT_PUMPS, ALL_SYSTEMS], weights=[50,30,20])[0]
    return random.choice(pool) if pool else None

print(f"  {len(eq_systems)} systems available")

# ── 4. Load estimator users ──────────────────────────────────

estimators = db.query(User).filter(User.role.in_(["estimator", "admin"])).all()
if not estimators:
    print("  WARNING: No estimators found. Using admin fallback.")
    estimators = db.query(User).filter_by(role="admin").all()
print(f"  {len(estimators)} estimators available")

# ── 5. Plans (~100 with realistic distribution) ──────────────

print("\nCreating ~100 plans...")

HOUSE_TYPES = [
    "NEWHAVEN", "TYPE A", "TYPE B", "THE STANFORD", "COLONIAL",
    "CRAFTSMAN", "THE MITCHELL", "CAPE COD", "FARMHOUSE", "THE SHERWOOD",
    "TOWNHOME END", "TOWNHOME MID", "THE BELMONT", "THE PIEDMONT",
    "RANCH CLASSIC", "THE ARLINGTON", "THE BETHESDA", "SPLIT LEVEL",
    "THE HAMILTON", "THE GEORGETOWN",
]

# Status distribution: 15 draft, 25 proposed, 30 contracted, 20 complete, 10 lost
STATUS_POOL = (
    ["draft"] * 15 +
    ["proposed"] * 25 +
    ["contracted"] * 30 +
    ["complete"] * 20 +
    ["lost"] * 10
)

proj_list = list(projects.values())
plan_count = 0
used_numbers = set(
    r[0] for r in db.query(Plan.plan_number).all()
)

for i in range(100):
    proj    = random.choice(proj_list)
    est     = random.choice(estimators)
    status  = STATUS_POOL[i]
    zones   = random.choices([1,2,3], weights=[50,35,15])[0]
    # Spread plans over 18 months
    created = rand_date(1, 540)
    ht_name = random.choice(HOUSE_TYPES)

    # Plan number: INITIALS + SEQ + MMYY
    for attempt in range(10):
        seq = str(random.randint(100, 999))
        mm  = f"{created.month:02d}"
        yy  = str(created.year)[-2:]
        plan_number = f"{est.initials}{seq}{mm}{yy}"
        if plan_number not in used_numbers:
            used_numbers.add(plan_number)
            break
    else:
        continue

    plan = Plan(
        plan_number=plan_number,
        estimator_name=est.full_name,
        estimator_initials=est.initials,
        project_id=proj.id,
        status=status,
        number_of_zones=zones,
        house_type=ht_name,
        created_at=created,
        updated_at=created + timedelta(hours=random.randint(1, 72)),
        contracted_at=(
            created + timedelta(days=random.randint(2, 14))
            if status in ("contracted", "complete") else None
        ),
    )
    db.add(plan)
    db.flush()

    # House type
    ht = HouseType(
        plan_id=plan.id,
        house_number="01",
        name=ht_name,
        bid_hours=random.choice([40, 60, 80, 100, 120, 140, 160]),
        pwk_sheet_metal=random.choice([150, 200, 250, 300, 350, 400, 450]),
    )
    db.add(ht)
    db.flush()

    total_bid = 0.0

    # Zones / systems
    for z in range(1, zones + 1):
        eq = pick_system()
        sys = System(
            house_type_id=ht.id,
            system_number=f"{z:02d}",
            zone_label=f"Zone {z}",
            equipment_system_id=eq.id if eq else None,
        )
        db.add(sys)
        db.flush()

        base_bid = float(eq.bid_price) if eq else random.uniform(6000, 18000)

        # Equipment line item
        if eq:
            db.add(LineItem(
                system_id=sys.id, sort_order="05",
                description=f"{eq.system_code} — {eq.description[:60]}",
                quantity=1, unit_price=float(eq.bid_price),
                part_number=eq.system_code,             ))
            total_bid += float(eq.bid_price)

        # Standard consumable items
        lineset_ft = random.uniform(15, 65)
        flex_ft    = random.uniform(25, 90)
        kit_items = [
            ("40", "Mastic Duct Sealing Package",                1,    random.uniform(55, 95)),
            ("50", "Float Switch",                               1,    35),
            ("60", "Service Valve Locking Caps",                 1,    15),
            ("70", f"Condensate Drain Line ({lineset_ft:.0f} ft)",     lineset_ft, 2.20),
            ("75", f"Refrigerant Line Set ({lineset_ft:.0f} ft)",      lineset_ft, random.uniform(8, 13)),
            ("76", f"R3 Rubatex Insulation ({lineset_ft:.0f} ft)",     lineset_ft, 2.80),
            ("80", f"Flex Duct ({flex_ft:.0f} ft)",              flex_ft, 3.50),
            ("85", "Sheet Metal — Supply Plenum",                1,    random.uniform(165, 240)),
            ("86", "Sheet Metal — Return Plenum",                1,    random.uniform(130, 200)),
            ("90", "Emergency Pan Under Indoor Equip",           1,    35),
            ("92", "Canvas Connector Supply/Return",             1,    45),
            ("95", "Bath Fans Run To Exterior (50 CFM)",         random.randint(1, 4), 65),
        ]
        for sort, desc, qty, price in kit_items:
            db.add(LineItem(
                system_id=sys.id, sort_order=sort,
                description=desc, quantity=qty,
                unit_price=price,             ))
            total_bid += qty * price

    # Draws (50/25/25 split)
    d1 = round(total_bid * 0.50, 2)
    d2 = round(total_bid * 0.25, 2)
    d3 = round(total_bid - d1 - d2, 2)
    for num, stage, amt in [(1, "rough_in", d1), (2, "indoor", d2), (3, "outdoor", d3)]:
        db.add(Draw(house_type_id=ht.id, draw_number=num, stage=stage, amount=amt))

    # Update total on house type
    ht.total_bid = round(total_bid, 2)

    # Event log
    db.add(EventLog(
        event_at=created,
        username=est.initials,
        plan_id=plan.id,
        event_type="plan_created",
        description=f"Plan {plan_number} created",
    ))
    if status in ("contracted", "complete"):
        db.add(EventLog(
            event_at=plan.contracted_at,
            username=est.initials,
            plan_id=plan.id,
            event_type="plan_contracted",
            description=f"Plan {plan_number} contracted",
        ))
    if status == "complete":
        db.add(EventLog(
            event_at=plan.contracted_at + timedelta(days=random.randint(30, 120)),
            username=est.initials,
            plan_id=plan.id,
            event_type="plan_completed",
            description=f"Plan {plan_number} marked complete",
        ))

    plan_count += 1

db.commit()
print(f"  {plan_count} plans created")

# ── Summary ───────────────────────────────────────────────────

print("\n" + "=" * 55)
print("Large demo dataset seeded successfully!")
print("=" * 55)

all_plans = db.query(Plan).all()
for status in ["draft", "proposed", "contracted", "complete", "lost"]:
    group = [p for p in all_plans if p.status == status]
    total = sum(float(ht.total_bid or 0) for p in group for ht in p.house_types)
    print(f"  {status.title():12} {len(group):3} plans   ${total:>12,.2f}")

print(f"\n  Builders:  {db.query(Builder).count()}")
print(f"  Projects:  {db.query(Project).count()}")
print(f"  Plans:     {len(all_plans)}")

db.close()
