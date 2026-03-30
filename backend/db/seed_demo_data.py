"""
Seeds realistic demo data based on real Metcalfe file structure.
Run after init_db.py and seed_admin.py:
    python db/seed_demo_data.py

Creates:
  - 8 estimator user accounts
  - 12 builders (real names from the MDB files)
  - 20 projects across MD/VA
  - ~60 plans spread across the last 3 weeks
  - Line items and draws on each plan
  - Realistic status distribution
"""
import sys, os, random
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from core.database import SessionLocal, engine, Base
from core.security import hash_password
from models.models import (
    User, Builder, Project, Plan, HouseType,
    System, LineItem, Draw, EventLog, EquipmentSystem, EquipmentManufacturer
)

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# ── Helpers ───────────────────────────────────────────────────

def days_ago(n):
    return datetime.now() - timedelta(days=n)

def rand_date(min_days, max_days):
    return days_ago(random.randint(min_days, max_days))

# ── 1. Estimator accounts ─────────────────────────────────────
print("Creating estimator accounts...")

ESTIMATORS = [
    ("bhackett",    "Brian Hackett",    "BH"),
    ("celam",       "Carson Elam",      "CE"),
    ("cstandridge", "Cliff Standridge", "CS"),
    ("dabelende",   "Derek Abelende",   "DA"),
    ("ganderson",   "Gary Anderson",    "GA"),
    ("jflewellyn",  "Jamie Flewellyn",  "JF"),
    ("jholsinger",  "Josh Holsinger",   "JH"),
    ("lwhittemore", "Lisa Whittemore",  "LW"),
]

users = {}
for username, full_name, initials in ESTIMATORS:
    existing = db.query(User).filter_by(username=username).first()
    if existing:
        users[initials] = existing
        continue
    u = User(
        username=username,
        full_name=full_name,
        initials=initials,
        email=f"{username}@metcalfe.com",
        hashed_password=hash_password("Metcalfe2026!"),
        role="estimator",
    )
    db.add(u)
    db.flush()
    users[initials] = u
    print(f"  Created: {full_name} ({initials}) — password: Metcalfe2026!")

# Add a manager
mgr = db.query(User).filter_by(username="manager").first()
if not mgr:
    mgr = User(
        username="manager",
        full_name="Office Manager",
        initials="OM",
        email="manager@metcalfe.com",
        hashed_password=hash_password("Metcalfe2026!"),
        role="manager",
    )
    db.add(mgr)
    db.flush()
    print("  Created: Office Manager (manager) — password: Metcalfe2026!")

db.commit()

# ── 2. Builders ───────────────────────────────────────────────
print("\nCreating builders...")

BUILDERS = [
    ("Q00082",  "Bethesda Homes",              "Steve Roth",       "301-555-0110"),
    ("Q00111",  "Washington Metro Homes",       "Dan Blatzheim",    "301-555-0122"),
    ("Q00118",  "Montgomery Homes",             "Bob Saah",         "301-555-0134"),
    ("Q00159",  "Sandy Spring Builders LLC",    "Jim Peterson",     "301-555-0146"),
    ("Q00196",  "PKK Builders",                 "Paul Klein",       "301-555-0158"),
    ("Q00224",  "Meridian Homes Inc",           "Tom Meridian",     "703-555-0170"),
    ("Q00246",  "Koch Homes",                   "Dave Koch",        "301-555-0182"),
    ("Q00316",  "Westbrook Homes LLC",          "Mike Westbrook",   "301-555-0194"),
    ("Q00479",  "Ten Oaks Realty",              "Chris Oaks",       "301-555-0206"),
    ("Q00489",  "J&A Builders Inc",             "John Allard",      "301-555-0218"),
    ("Q00590",  "Allan Stephens",               "Allan Stephens",   "301-555-0230"),
    ("Q00839",  "PDR Homes",                    "Greg Mason",       "301-305-7114"),
]

builders = {}
for code, name, contact, phone in BUILDERS:
    existing = db.query(Builder).filter_by(code=code).first()
    if existing:
        builders[code] = existing
        continue
    b = Builder(
        code=code, name=name,
        contact_name=contact, office_phone=phone,
        city=random.choice(["Rockville","Bethesda","Frederick","Annapolis","Arlington"]),
        state=random.choice(["MD","MD","MD","VA"]),
    )
    db.add(b)
    db.flush()
    builders[code] = b

db.commit()
print(f"  {len(builders)} builders ready")

# ── 3. Projects ───────────────────────────────────────────────
print("\nCreating projects...")

PROJECTS = [
    ("RB1011",  "BEECH AVE (5800)",              "Q00082"),
    ("RC1190",  "COOPER RD",                     "Q00479"),
    ("RC1203",  "CAYUGA AVE (78704)",             "Q00224"),
    ("RC1205",  "CLUBB RESIDENCE",               "Q00224"),
    ("RD0409",  "DAHLONEGA RD (6401)",            "Q00118"),
    ("RF0584",  "FOWLER RES",                    "Q00159"),
    ("RF0595",  "FAIRFAX RD (7124)",              "Q00159"),
    ("RH0676",  "HEMPSTEAD AVE (8904)",           "Q00082"),
    ("RJ0203",  "JIGGSY COURT",                  "Q00489"),
    ("RL0610",  "LEGATION ST NW (3616)",          "Q00196"),
    ("RL0615",  "LAUGTUG RES",                   "Q00479"),
    ("RM0904",  "MCGREGOR RES",                  "Q00159"),
    ("RM0913",  "MCKINNEY RES (819 BESTGATE)",    "Q00246"),
    ("RN0345",  "N. RANDOLPH ST (3418)",          "Q00590"),
    ("RN0348",  "NIH FAES HOUSING",              "Q00159"),
    ("RP0732",  "PARADISE CHURCH",               "Q00839"),
    ("RS1291",  "STANFORD ST (4212)",             "Q00196"),
    ("RS1292",  "SOUTH VILLA AVE",               "Q00111"),
    ("RS1308",  "SKIBO RES (123 BAY DR)",         "Q00159"),
    ("RW0869",  "WETZEL RES",                    "Q00590"),
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

# ── 4. Get real equipment systems ────────────────────────────
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

# ── 5. Plans ─────────────────────────────────────────────────
print("\nCreating plans...")

HOUSE_TYPES = [
    "NEWHAVEN", "TYPE A", "TYPE B", "THE STANFORD",
    "COLONIAL", "CRAFTSMAN", "THE MITCHELL", "CAPE COD",
    "FARMHOUSE", "THE SHERWOOD", "TOWNHOME END", "TOWNHOME MID",
]

STANDARD_ITEMS = [
    ("01", "Rough In Draw",                        0,       0,     "rough_in"),
    ("02", "Indoor Draw",                          0,       0,     "indoor"),
    ("03", "Outdoor Draw",                         0,       0,     "outdoor"),
    ("10", "Z#1 Indoor Equipment",                 0,       0,     None),
    ("20", "Z#1 Outdoor Equipment",                0,       0,     None),
    ("30", "Z#1 Thermostat",                       0,       0,     None),
    ("40", "Mastic Duct Sealing Package",          50,      0,     None),
    ("50", "Float Switch",                         35,      0,     None),
    ("60", "Service Valve Locking Caps",           15,      0,     None),
    ("70", "Condensate Drain Line",                45,      0,     None),
    ("80", "Emergency Pan Under Indoor Equipment", 35,      0,     None),
    ("90", "Canvas Connector Supply/Return",       45,      0,     None),
    ("95", "Bath Fans Run To Exterior (50 CFM)",   0,       0,     None),
]

STATUSES = ["draft","proposed","contracted","contracted","contracted","complete","complete"]

proj_list = list(projects.values())
est_list  = list(users.values())
plan_count = 0

for i in range(65):
    proj    = random.choice(proj_list)
    est     = random.choice(est_list)
    status  = random.choice(STATUSES)
    zones   = random.choice([1,1,1,2,2,3])
    created = rand_date(1, 21)
    ht_name = random.choice(HOUSE_TYPES)

    # Plan number: INITIALS + SEQ + MMYY
    seq = str(random.randint(100,999))
    mm  = f"{created.month:02d}"
    yy  = str(created.year)[-2:]
    plan_number = f"{est.initials}{seq}{mm}{yy}"

    # Skip if duplicate
    if db.query(Plan).filter_by(plan_number=plan_number).first():
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
        updated_at=created,
        contracted_at=created + timedelta(days=random.randint(1,5)) if status in ("contracted","complete") else None,
    )
    db.add(plan)
    db.flush()

    # House type
    ht = HouseType(
        plan_id=plan.id,
        house_number="01",
        name=ht_name,
        bid_hours=random.choice([60,80,100,120,140,160]),
        pwk_sheet_metal=random.choice([200,250,300,350,400]),
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

        # Draw amounts — based on bid total
        base_bid = float(eq.bid_price) if eq else random.uniform(8000, 18000)

        # Add equipment as first line item
        if eq:
            db.add(LineItem(
                system_id=sys.id, sort_order="05",
                description=f"{eq.system_code} — {eq.description[:60]}",
                quantity=1, unit_price=float(eq.bid_price),
                part_number=eq.system_code, pricing_flag="standard",
            ))
            total_bid += float(eq.bid_price)

        # Standard consumable items
        lineset_ft = random.uniform(20, 60)
        flex_ft    = random.uniform(30, 80)
        kit_items = [
            ("40", "Mastic Duct Sealing Package",        1,    random.uniform(58, 90)),
            ("50", "Float Switch",                       1,    35),
            ("60", "Service Valve Locking Caps",         1,    15),
            ("70", f"Condensate Drain Line ({lineset_ft:.0f} ft)", lineset_ft, 2.20),
            ("75", f"Refrigerant Line Set ({lineset_ft:.0f} ft)",  lineset_ft, random.uniform(9, 12)),
            ("76", f"R3 Rubatex Insulation ({lineset_ft:.0f} ft)", lineset_ft, 2.80),
            ("80", f"Flex Duct ({flex_ft:.0f} ft)",      flex_ft, 3.50),
            ("85", "Sheet Metal — Supply Plenum",        1,    random.uniform(175, 230)),
            ("86", "Sheet Metal — Return Plenum",        1,    random.uniform(140, 190)),
            ("90", "Emergency Pan Under Indoor Equip",   1,    35),
            ("92", "Canvas Connector Supply/Return",     1,    45),
            ("95", "Bath Fans Run To Exterior (50 CFM)", 1,    0),
        ]
        for sort, desc, qty, price in kit_items:
            db.add(LineItem(
                system_id=sys.id, sort_order=sort,
                description=desc, quantity=qty,
                unit_price=price, pricing_flag="standard",
            ))
            total_bid += qty * price

    # Draws
    draw_total = total_bid
    d1 = round(draw_total * 0.50, 2)
    d2 = round(draw_total * 0.25, 2)
    d3 = round(draw_total - d1 - d2, 2)
    for num, stage, amt in [(1,"rough_in",d1),(2,"indoor",d2),(3,"outdoor",d3)]:
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
    if status in ("contracted","complete"):
        db.add(EventLog(
            event_at=plan.contracted_at,
            username=est.initials,
            plan_id=plan.id,
            event_type="plan_contracted",
            description=f"Plan {plan_number} contracted",
        ))

    plan_count += 1

db.commit()
print(f"  {plan_count} plans created")

# ── Summary ───────────────────────────────────────────────────
print("\n" + "="*50)
print("Demo data seeded successfully!")
print("="*50)

all_plans = db.query(Plan).all()
for status in ["draft","proposed","contracted","complete"]:
    group = [p for p in all_plans if p.status == status]
    total = sum(float(ht.total_bid or 0) for p in group for ht in p.house_types)
    print(f"  {status.title():12} {len(group):3} plans   ${total:>12,.2f}")

print(f"\n  Total plans: {len(all_plans)}")
print(f"\nEstimator login credentials (all same password):")
print(f"  Username: bhackett, celam, cstandridge, dabelende")
print(f"  Username: ganderson, jflewellyn, jholsinger, lwhittemore")
print(f"  Password: Metcalfe2026!")
print(f"  Manager:  manager / Metcalfe2026!")
print(f"  Admin:    admin / ChangeMe123!")

db.close()
