"""
Demo seed script — clears builders/projects/plans and fills with 60 realistic entries each.

Usage:
    python scripts/seed_demo.py
"""
import sys, os, random
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from core.database import SessionLocal
from models.models import (
    Builder, Project, Plan, HouseType, System, LineItem, Draw,
    Document, EventLog, EquipmentSystem
)

# ── Seed data ─────────────────────────────────────────────────

BUILDERS = [
    ("RYAN",     "Ryan Homes",                     "David Mercer",   "703-555-0101", "703-555-0201", "dmercer@ryanhomes.com",         "11700 Plaza America Dr",   "Reston",        "VA", "20190"),
    ("STANLEY",  "Stanley Martin Homes",            "Carol Whitfield","571-555-0102", "571-555-0202", "cwhitfield@stanleymartin.com",  "11790 Sunrise Valley Dr",  "Reston",        "VA", "20191"),
    ("TOLL",     "Toll Brothers",                   "James Overton",  "202-555-0103", "202-555-0303", "joverton@tollbrothers.com",     "1140 Connecticut Ave NW",  "Washington",    "DC", "20036"),
    ("HOVNAN",   "K. Hovnanian Homes",              "Susan Park",     "410-555-0104", "410-555-0404", "spark@khov.com",                "100 First Stamp Ct",       "Hunt Valley",   "MD", "21030"),
    ("MILLER",   "Miller & Smith Homes",            "Robert Graves",  "703-555-0105", "703-555-0505", "rgraves@millersmith.com",       "8401 Connecticut Ave",     "Chevy Chase",   "MD", "20815"),
    ("BROOKFLD", "Brookfield Residential",          "Angela Torres",  "240-555-0106", "240-555-0606", "atorres@brookfield.com",        "7501 Wisconsin Ave",       "Bethesda",      "MD", "20814"),
    ("MARONDA",  "Maronda Homes",                   "Kevin Stills",   "614-555-0107", "614-555-0707", "kstills@marondahomes.com",      "5000 Bradenton Ave",       "Dublin",        "OH", "43017"),
    ("CRAFTSTR", "Craftstar Homes",                 "Diane Fowler",   "540-555-0108", "540-555-0808", "dfowler@craftstarhomes.com",    "2201 Libbie Ave",          "Richmond",      "VA", "23230"),
    ("NEXTHOME", "NexHome Communities",             "Marcus Bell",    "804-555-0109", "804-555-0909", "mbell@nexthome.com",            "4810 Sadler Rd",           "Glen Allen",    "VA", "23060"),
    ("EASTWOOD", "Eastwood Homes",                  "Patricia Hale",  "704-555-0110", "704-555-1010", "phale@eastwoodhomes.com",       "3321 Pineville Rd",        "Charlotte",     "NC", "28210"),
    ("DREES",    "Drees Homes",                     "Craig Nolan",    "513-555-0111", "513-555-1111", "cnolan@dreeshomes.com",         "211 Grandview Dr",         "Fort Mitchell", "KY", "41017"),
    ("CENTEX",   "Centex Homes",                    "Nancy Caldwell", "615-555-0112", "615-555-1212", "ncaldwell@centex.com",          "500 James Robertson Pkwy", "Nashville",     "TN", "37219"),
    ("MAINVUE",  "MainVue Homes",                   "Ethan Reyes",    "425-555-0113", "425-555-1313", "ereyes@mainvuehomes.com",       "1201 Monster Rd SW",       "Renton",        "WA", "98057"),
    ("ROONEY",   "Rooney & Associates",             "Linda Chu",      "703-555-0114", "703-555-1414", "lchu@rooneyassoc.com",          "8300 Boone Blvd",          "Vienna",        "VA", "22182"),
    ("MERIDIAN", "Meridian Builders Group",         "Scott Vance",    "301-555-0115", "301-555-1515", "svance@meridianbuilders.com",   "1 Bethesda Metro Ctr",     "Bethesda",      "MD", "20814"),
    ("SUNRIDGE", "Sunridge Development",            "Alice Monroe",   "540-555-0116", "540-555-1616", "amonroe@sunridgedev.com",       "300 Garrisonville Rd",     "Stafford",      "VA", "22554"),
    ("PATRIOT",  "Patriot Homes Inc",               "Brian Kelly",    "571-555-0117", "571-555-1717", "bkelly@patriothomes.com",       "9990 Fairfax Blvd",        "Fairfax",       "VA", "22030"),
    ("LEGACY",   "Legacy Custom Homes",             "Jennifer Nash",  "804-555-0118", "804-555-1818", "jnash@legacycustomhomes.com",   "2600 Buford Rd",           "Richmond",      "VA", "23235"),
    ("PRIMUS",   "Primus Builders",                 "Tom Garrett",    "410-555-0119", "410-555-1919", "tgarrett@primusbuilders.com",   "1954 Greenspring Dr",      "Timonium",      "MD", "21093"),
    ("SUMMIT",   "Summit Construction Group",       "Carla Dixon",    "703-555-0120", "703-555-2020", "cdixon@summitconst.com",        "12110 Sunset Hills Rd",    "Reston",        "VA", "20190"),
    ("VICTORY",  "Victory Homes LLC",               "Daniel Wu",      "540-555-0121", "540-555-2121", "dwu@victoryhomesllc.com",       "100 Market St",            "Harrisonburg",  "VA", "22801"),
    ("CHESAPK",  "Chesapeake Development Co",       "Megan Powell",   "410-555-0122", "410-555-2222", "mpowell@chesapeakedev.com",     "2 Hamill Rd",              "Baltimore",     "MD", "21210"),
    ("STONEBRG", "Stonebridge Homes",               "Ryan Jacobs",    "703-555-0123", "703-555-2323", "rjacobs@stonebridgehomes.com",  "13800 Coppermine Rd",      "Herndon",       "VA", "20171"),
    ("FOXHALL",  "Foxhall Custom Builders",         "Kathryn Murray", "301-555-0124", "301-555-2424", "kmurray@foxhallbuilders.com",   "5530 Wisconsin Ave",       "Chevy Chase",   "MD", "20815"),
    ("ANTHEM",   "Anthem Builders Inc",             "Steve Fisher",   "571-555-0125", "571-555-2525", "sfisher@anthembuilders.com",    "2001 Edmund Halley Dr",    "Reston",        "VA", "20191"),
    ("CLARIDGE", "Claridge Homes",                  "Amy Hoffman",    "410-555-0126", "410-555-2626", "ahoffman@claridgehomes.com",    "500 York Rd",              "Towson",        "MD", "21204"),
    ("HEARTLD",  "Heartland Communities",           "Mark Spencer",   "804-555-0127", "804-555-2727", "mspencer@heartlandcomm.com",   "9020 Stony Point Pkwy",    "Richmond",      "VA", "23235"),
    ("CRESTMNT", "Crestmont Residential",           "Tara Fleming",   "703-555-0128", "703-555-2828", "tfleming@crestmontres.com",     "8200 Greensboro Dr",       "McLean",        "VA", "22102"),
    ("ASCENT",   "Ascent Homes",                    "Chris Bond",     "571-555-0129", "571-555-2929", "cbond@ascenthomes.com",         "11480 Commerce Park Dr",   "Reston",        "VA", "20191"),
    ("KEYSTONE", "Keystone Custom Homes",           "Laura West",     "717-555-0130", "717-555-3030", "lwest@keystonecustom.com",      "276 Granite Run Dr",       "Lancaster",     "PA", "17601"),
    ("HOMECRFT", "HomeCraft Builders",              "Wayne Torres",   "540-555-0131", "540-555-3131", "wtorres@homecraftbuilders.com", "4100 Plank Rd",            "Fredericksburg","VA", "22407"),
    ("NOVUSGRP", "Novus Group Homes",               "Gail Henderson", "301-555-0132", "301-555-3232", "ghenderson@novusgrouphomes.com","14800 Sweitzer Ln",        "Laurel",        "MD", "20707"),
    ("PINNACLE", "Pinnacle Residential Group",      "Aaron Mills",    "703-555-0133", "703-555-3333", "amills@pinnacleresidential.com","1600 Wilson Blvd",         "Arlington",     "VA", "22209"),
    ("OAKMONT",  "Oakmont Development LLC",         "Pamela Scott",   "804-555-0134", "804-555-3434", "pscott@oakmontdev.com",         "7201 Glen Forest Dr",      "Richmond",      "VA", "23226"),
    ("CONCORD",  "Concord Builders Group",          "Frank Cooper",   "614-555-0135", "614-555-3535", "fcooper@concordbuilders.com",   "300 Marconi Blvd",         "Columbus",      "OH", "43215"),
    ("MADISON",  "Madison Homes Corp",              "Grace Kim",      "703-555-0136", "703-555-3636", "gkim@madisonhomescorp.com",     "7700 Leesburg Pike",       "Falls Church",  "VA", "22043"),
    ("HORIZON",  "Horizon Home Builders",           "Phil Andrews",   "757-555-0137", "757-555-3737", "pandrews@horizonhb.com",        "999 Waterside Dr",         "Norfolk",       "VA", "23510"),
    ("LANDMARK", "Landmark Homes of Virginia",      "Sue Ramsey",     "540-555-0138", "540-555-3838", "sramsey@landmarkhomesva.com",   "520 University Blvd",      "Harrisonburg",  "VA", "22801"),
    ("BARRINGTON","Barrington Custom Homes",        "Neil Foster",    "301-555-0139", "301-555-3939", "nfoster@barringtoncustomhomes.com","One Maryland Ave",       "Annapolis",     "MD", "21401"),
    ("COLONIAL", "Colonial Heritage Builders",      "Kim Larson",     "804-555-0140", "804-555-4040", "klarson@colonialheritage.com",  "4801 Wesover Hills Blvd",  "Richmond",      "VA", "23225"),
    ("WILLOW",   "Willow Creek Homes",              "Greg Simmons",   "540-555-0141", "540-555-4141", "gsimmons@willowcreekhomes.com", "1600 Emmet St N",          "Charlottesville","VA","22903"),
    ("EMERALD",  "Emerald Isle Builders",           "Donna Price",    "757-555-0142", "757-555-4242", "dprice@emeraldislebuilders.com","600 22nd St",              "Virginia Beach","VA", "23451"),
    ("BLUESTONE","Bluestone Development Corp",      "Ben Wallace",    "304-555-0143", "304-555-4343", "bwallace@bluestonedev.com",     "600 Quarrier St",          "Charleston",    "WV", "25301"),
    ("TRIDENT",  "Trident Custom Homes",            "Joan Barker",    "703-555-0144", "703-555-4444", "jbarker@tridentcustomhomes.com","2000 Corporate Ridge Rd",  "McLean",        "VA", "22102"),
    ("NORWOOD",  "Norwood Residential",             "Matt Owens",     "410-555-0145", "410-555-4545", "mowens@norwoodresidential.com", "120 E Baltimore St",       "Baltimore",     "MD", "21202"),
    ("CROSSINGS","The Crossings Group",             "Rachel Dunn",    "571-555-0146", "571-555-4646", "rdunn@thecrossingsgroup.com",   "1760 Reston Pkwy",         "Reston",        "VA", "20190"),
    ("HARBORV",  "Harbor View Builders",            "Earl Quinn",     "757-555-0147", "757-555-4747", "equinn@harborviewbuilders.com", "4525 Main St",             "Virginia Beach","VA", "23462"),
    ("ALPINE",   "Alpine Ridge Homes",              "Sara Conley",    "540-555-0148", "540-555-4848", "sconley@alpineridgehomes.com",  "300 Arbor Dr",             "Blacksburg",    "VA", "24060"),
    ("COPPERWD", "Copperwood Custom Homes",         "Tim Harvey",     "703-555-0149", "703-555-4949", "tharvey@copperwoodhomes.com",   "10400 Eaton Pl",           "Fairfax",       "VA", "22030"),
    ("PRESTWICK","Prestwick Home Builders",         "Clare Moody",    "804-555-0150", "804-555-5050", "cmoody@prestwickbuilders.com",  "2810 N Parham Rd",         "Richmond",      "VA", "23294"),
    ("ASPEN",    "Aspen Communities",               "Nick Tanner",    "240-555-0151", "240-555-5151", "ntanner@aspencommunities.com",  "6400 Goldsboro Rd",        "Bethesda",      "MD", "20817"),
    ("CARDINAL", "Cardinal Custom Builders",        "Vicki Lane",     "540-555-0152", "540-555-5252", "vlane@cardinalbuilders.com",    "620 Caroline St",          "Fredericksburg","VA", "22401"),
    ("IRONWOOD", "Ironwood Development Group",      "Paul Steele",    "571-555-0153", "571-555-5353", "psteele@ironwooddev.com",       "1900 Campus Commons Dr",   "Reston",        "VA", "20191"),
    ("SADDLBRK", "Saddlebrook Homes LLC",           "Mary Grant",     "804-555-0154", "804-555-5454", "mgrant@saddlebrookhomes.com",   "6800 Paragon Pl",          "Richmond",      "VA", "23230"),
    ("GENESIS",  "Genesis Home Builders",           "Larry Cross",    "703-555-0155", "703-555-5555", "lcross@genesishomebuilders.com","11400 Commerce Park Dr",   "Reston",        "VA", "20191"),
    ("FOXCROFT", "Foxcroft Homes",                  "Dana Rhodes",    "410-555-0156", "410-555-5656", "drhodes@foxcrofthomes.com",     "600 Red Brook Blvd",       "Owings Mills",  "MD", "21117"),
    ("WESTLAND", "Westland Building Group",         "Roy Chambers",   "703-555-0157", "703-555-5757", "rchambers@westlandbuilding.com","8270 Greensboro Dr",       "McLean",        "VA", "22102"),
    ("CANOVA",   "Canova Construction Co",          "Anna Thornton",  "301-555-0158", "301-555-5858", "athornton@canovaconstruction.com","15245 Shady Grove Rd",   "Rockville",     "MD", "20850"),
    ("SUMMIT2",  "Summit View Homes",               "Dale Hicks",     "540-555-0159", "540-555-5959", "dhicks@summitviewhomes.com",    "1600 Valley View Blvd",    "Roanoke",       "VA", "24012"),
    ("LEGACY2",  "Legacy Ridge Development",        "Fran Meyer",     "804-555-0160", "804-555-6060", "fmeyer@legacyridgedev.com",     "3950 University Blvd",     "Richmond",      "VA", "23230"),
]

PROJECTS = [
    ("OAKHL001", "The Reserve at Oak Hill",           "RYAN"),
    ("BRMBL001", "Brambleton Commons",                "STANLEY"),
    ("STRGE001", "Stone Ridge Estates",               "TOLL"),
    ("LAKEV001", "Lakeview Crossing",                 "HOVNAN"),
    ("RIVRD001", "Riverton Glen",                     "MILLER"),
    ("MAPLL001", "Maple Leaf Landing",                "BROOKFLD"),
    ("SUMMT001", "Summit Pointe",                     "MARONDA"),
    ("CEDAR001", "Cedar Creek Villas",                "CRAFTSTR"),
    ("NEXTS001", "Nextshire Commons",                 "NEXTHOME"),
    ("PINES001", "The Pines at Eastwood",             "EASTWOOD"),
    ("GREWD001", "Greenwood Preserve",                "DREES"),
    ("BELMT001", "Belmont Station",                   "CENTEX"),
    ("SUNSET001","Sunset Ridge",                      "MAINVUE"),
    ("WILBR001", "Wildberry Run",                     "ROONEY"),
    ("MERDN001", "Meridian Crossing",                 "MERIDIAN"),
    ("CHSNT001", "Chestnut Hill Farms",               "SUNRIDGE"),
    ("COLNY001", "Colony Park",                       "PATRIOT"),
    ("LEGCY001", "Legacy Pointe",                     "LEGACY"),
    ("PRMVW001", "Primus View Estates",               "PRIMUS"),
    ("SMTVW001", "Summit View Townhomes",             "SUMMIT"),
    ("VICTRY001","Victory Ridge",                     "VICTORY"),
    ("COVES001", "The Coves at Chesapeake",           "CHESAPK"),
    ("STBRG001", "Stonebridge at Lansdowne",          "STONEBRG"),
    ("FOXHL001", "Foxhall Village",                   "FOXHALL"),
    ("ANTHM001", "Anthem at Cascades",                "ANTHEM"),
    ("CLRDG001", "Claridge Estates",                  "CLARIDGE"),
    ("HERTL001", "Heartland Village",                 "HEARTLD"),
    ("CRSMN001", "Crestmont on the Lake",             "CRESTMNT"),
    ("ASCNT001", "Ascent at Dulles",                  "ASCENT"),
    ("KYSTS001", "Keystone at Millwood",              "KEYSTONE"),
    ("HMCFT001", "HomeCraft at Falls Run",            "HOMECRFT"),
    ("NOVUS001", "Novus at Laurel Lakes",             "NOVUSGRP"),
    ("PNCLE001", "Pinnacle at Rosslyn",               "PINNACLE"),
    ("OAKMT001", "Oakmont Commons",                   "OAKMONT"),
    ("CNCRD001", "Concord Ridge",                     "CONCORD"),
    ("MADSN001", "Madison Place",                     "MADISON"),
    ("HORZN001", "Horizon Shores",                    "HORIZON"),
    ("LNDMK001", "Landmark at Stone Port",            "LANDMARK"),
    ("BARRN001", "Barrington Estates",                "BARRINGTON"),
    ("COLON001", "Colonial at Hanover",               "COLONIAL"),
    ("WLLWC001", "Willow Creek Crossing",             "WILLOW"),
    ("EMRLD001", "Emerald Cove",                      "EMERALD"),
    ("BLSTN001", "Bluestone at the Kanawha",          "BLUESTONE"),
    ("TRIDT001", "Trident Landing",                   "TRIDENT"),
    ("NORWD001", "Norwood Park",                      "NORWOOD"),
    ("CROSS001", "The Crossings at Loudoun",          "CROSSINGS"),
    ("HRBVW001", "Harbor View at Shore Drive",        "HARBORV"),
    ("ALPIN001", "Alpine Ridge at Huckleberry",       "ALPINE"),
    ("CPRWD001", "Copperwood Villas",                 "COPPERWD"),
    ("PRWCK001", "Prestwick at Wyndham",              "PRESTWICK"),
    ("ASPNC001", "Aspen Chase",                       "ASPEN"),
    ("CRDNL001", "Cardinal Crossing",                 "CARDINAL"),
    ("IRNWD001", "Ironwood at Fairways",              "IRONWOOD"),
    ("SDBRK001", "Saddlebrook Estates",               "SADDLBRK"),
    ("GNSS001",  "Genesis at Liberty Park",           "GENESIS"),
    ("FXCFT001", "Foxcroft Commons",                  "FOXCROFT"),
    ("WSTLD001", "Westland Preserve",                 "WESTLAND"),
    ("CNVA001",  "Canova at Shady Grove",             "CANOVA"),
    ("SMTVW002", "Summit View at Coyner Springs",     "SUMMIT2"),
    ("LGRD001",  "Legacy Ridge at Wyndham",           "LEGACY2"),
    ("OAKHL002", "Oak Hill Reserve Phase II",         "RYAN"),
]

HOUSE_MODELS = [
    "The Ashford", "The Berkshire", "The Canterbury", "The Dorchester",
    "The Essex", "The Fairfax", "The Grandview", "The Hampton",
    "The Inverness", "The Jefferson", "The Kingston", "The Lexington",
    "The Montrose", "The Newport", "The Oxford", "The Princeton",
    "The Queensbury", "The Richmond", "The Saratoga", "The Tidewater",
    "Elevation A", "Elevation B", "Elevation C", "Elevation D",
    "Model 2200", "Model 2400", "Model 2800", "Model 3200", "Model 3600",
]

ZONE_LABELS = [
    "Main Floor", "Upper Floor", "Basement", "Bonus Room",
    "First Floor", "Second Floor", "Third Floor", "Finished Basement",
]

STATUSES = ["draft", "proposed", "contracted", "complete", "lost"]
STATUS_WEIGHTS = [15, 15, 20, 20, 10]

STANDARD_ITEMS = [
    ("01", "Emergency pan under indoor equipment",       1,  35.00),
    ("02", "Canvas connector supply/return",             1,  45.00),
    ("03", "Fire stopping — band board penetrations",    1,  55.00),
    ("04", "Refrigerant lines through band board",       1,  40.00),
    ("05", "Bath fans run to exterior (50 CFM)",         2,  65.00),
    ("06", "Float switch",                               1,  35.00),
    ("07", "Service valve locking caps",                 1,  15.00),
    ("08", "Condensate drain line — PVC",                1,  45.00),
    ("09", "Mastic duct sealing package",                1,  70.00),
    ("10", "Sheet metal — supply plenum",                1,  95.00),
    ("11", "Sheet metal — return plenum",                1,  85.00),
    ("12", "Flex duct (7-in, per run)",                  6,  28.00),
    ("13", "Flex duct connectors / clamps",              1,  22.00),
    ("14", "Start-up and commissioning",                 1, 125.00),
    ("15", "Lineset insulation wrap",                    1,  55.00),
    ("16", "Thermostat wiring",                          1,  40.00),
    ("17", "Condensate pump",                            1,  85.00),
    ("18", "Electrical disconnect",                      1,  65.00),
    ("19", "Filter rack 1-inch",                         1,  45.00),
    ("20", "Attic access platform",                      1,  75.00),
]

DRAW_STAGES = [
    ("rough",    1, 0.35),
    ("trim",     2, 0.35),
    ("final",    3, 0.30),
]

ESTIMATORS = [
    ("Austin Cantrell",   "AC"),
    ("James Doyle",       "JD"),
    ("Sarah Mitchell",    "SM"),
    ("Patrick Reeves",    "PR"),
]


def random_date(days_back=365):
    return datetime.now() - timedelta(days=random.randint(0, days_back))


def pick_status():
    return random.choices(STATUSES, weights=STATUS_WEIGHTS, k=1)[0]


def plan_number(initials, seq, dt):
    return f"{initials}{seq:03d}{dt.strftime('%m%y')}"


def seed(db):
    print("Clearing existing data...")

    # Delete in dependency order
    db.query(Document).delete()
    db.query(EventLog).delete()
    from sqlalchemy import text
    db.execute(text("DELETE FROM line_items"))
    db.execute(text("DELETE FROM draws"))
    db.execute(text("DELETE FROM systems"))
    db.execute(text("DELETE FROM house_types"))
    db.execute(text("DELETE FROM plans"))
    db.execute(text("DELETE FROM projects"))
    db.execute(text("DELETE FROM builders"))
    db.commit()
    print("  Cleared.")

    # ── Builders ──────────────────────────────────────────────
    print(f"Inserting {len(BUILDERS)} builders...")
    builder_map = {}
    for (code, name, contact, phone, cell, email, addr, city, state, zipcode) in BUILDERS:
        b = Builder(
            code=code, name=name, contact_name=contact,
            office_phone=phone, cell_phone=cell, email=email,
            address=addr, city=city, state=state, zip_code=zipcode,
            active=True,
        )
        db.add(b)
        db.flush()
        builder_map[code] = b.id
    db.commit()
    print(f"  {len(BUILDERS)} builders inserted.")

    # ── Projects ──────────────────────────────────────────────
    print(f"Inserting {len(PROJECTS)} projects...")
    project_map = {}
    for (code, name, builder_code) in PROJECTS:
        p = Project(
            code=code, name=name,
            builder_id=builder_map[builder_code],
            active=True,
        )
        db.add(p)
        db.flush()
        project_map[code] = p.id
    db.commit()
    print(f"  {len(PROJECTS)} projects inserted.")

    # ── Plans ─────────────────────────────────────────────────
    print("Inserting 60 plans with house types, systems, and line items...")
    project_codes = list(project_map.keys())
    seq_counters = {initials: 1 for _, initials in ESTIMATORS}

    for i in range(60):
        est_name, est_initials = random.choice(ESTIMATORS)
        proj_code = project_codes[i % len(project_codes)]
        created   = random_date(400)
        status    = pick_status()
        seq       = seq_counters[est_initials]
        seq_counters[est_initials] += 1

        plan = Plan(
            plan_number        = plan_number(est_initials, seq, created),
            estimator_name     = est_name,
            estimator_initials = est_initials,
            project_id         = project_map[proj_code],
            status             = status,
            number_of_zones    = random.randint(1, 3),
            house_type         = random.choice(HOUSE_MODELS),
            notes              = None,
            created_at         = created,
            contracted_at      = created + timedelta(days=random.randint(5, 30)) if status in ("contracted", "complete") else None,
        )
        db.add(plan)
        db.flush()

        # 1-2 house types per plan
        n_house_types = random.randint(1, 2)
        plan_total = 0.0

        for ht_idx in range(n_house_types):
            ht_name = random.choice(HOUSE_MODELS)
            ht = HouseType(
                plan_id     = plan.id,
                house_number= f"{ht_idx+1:02d}",
                name        = ht_name,
                bid_hours   = round(random.uniform(12, 40), 2),
            )
            db.add(ht)
            db.flush()

            ht_total = 0.0

            # 1-2 systems per house type
            n_systems = random.randint(1, 2)
            for sys_idx in range(n_systems):
                zone = random.choice(ZONE_LABELS)
                sys = System(
                    house_type_id = ht.id,
                    system_number = f"{sys_idx+1:02d}",
                    zone_label    = zone,
                )
                db.add(sys)
                db.flush()

                # Pick 8-12 line items from the standard list
                items = random.sample(STANDARD_ITEMS, k=random.randint(8, min(12, len(STANDARD_ITEMS))))
                # Add equipment cost as first item
                equip_price = round(random.uniform(1800, 5500), 2)
                eq_li = LineItem(
                    system_id    = sys.id,
                    sort_order   = "00",
                    pricing_flag = "standard",
                    description  = "Equipment — HVAC system package",
                    quantity     = 1,
                    unit_price   = equip_price,
                    draw_stage   = "rough",
                )
                db.add(eq_li)
                ht_total += equip_price

                for sort, desc, qty, price in items:
                    li = LineItem(
                        system_id    = sys.id,
                        sort_order   = sort,
                        pricing_flag = "standard",
                        description  = desc,
                        quantity     = qty,
                        unit_price   = price,
                        draw_stage   = random.choice(["rough", "trim", "final"]),
                    )
                    db.add(li)
                    ht_total += qty * price

            # Draws for this house type
            for stage, draw_num, pct in DRAW_STAGES:
                db.add(Draw(
                    house_type_id = ht.id,
                    stage         = stage,
                    draw_number   = draw_num,
                    amount        = round(ht_total * pct, 2),
                ))

            ht.total_bid = round(ht_total, 2)
            plan_total += ht_total

        db.flush()

    db.commit()
    print("  60 plans inserted.")
    print("\nSeed complete.")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
