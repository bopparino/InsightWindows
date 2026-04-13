"""
Seeds new kit variant categories from MDB Excel exports.

Categories added:
  RT — Round Trunk (pipes, elbows, tees, reducers)
  DT — DB Triangles & Return Air Pans
  SM — Sheet Metal (size-based LBF/SQF pricing)
  FD — Flex Duct (per-foot by size)
  FR — Flex Runs (R8 insulated flex + foil connectors)
  WC — Wall Caps & Roof Jacks
  S  — Registers & Grills (expanded with RA/CA grill data)

Run from backend/:
    python db/seed_mdb_variants.py

Safe to re-run — skips categories that already exist.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from core.database import SessionLocal, engine
from models.models import Base, KitVariant

Base.metadata.create_all(bind=engine)

# (category_code, category_name, variant_code, variant_name, per_kit, per_foot, sort_order)
NEW_VARIANTS = [
    # ── RT: Round Trunk (pipes, elbows, tees, reducers) ──────
    ("RT","Round Trunk","RP-01A", '8" Round Pipe (per ft)',       1.45, 0,  10),
    ("RT","Round Trunk","RP-02A", '10" Round Pipe (per ft)',      1.93, 0,  20),
    ("RT","Round Trunk","RP-03A", '12" Round Pipe (per ft)',      2.42, 0,  30),
    ("RT","Round Trunk","RP-04A", '14" Round Pipe (per ft)',      3.77, 0,  40),
    ("RT","Round Trunk","RP-05A", '16" Round Pipe (per ft)',      6.45, 0,  50),
    ("RT","Round Trunk","RP-06A", '8" Round Elbow',               2.54, 0,  60),
    ("RT","Round Trunk","RP-07A", '10" Round Elbow',              4.54, 0,  70),
    ("RT","Round Trunk","RP-08A", '12" Round Elbow',              5.64, 0,  80),
    ("RT","Round Trunk","RP-09A", '14" Round Elbow',              8.43, 0,  90),
    ("RT","Round Trunk","RP-10A", '16" Round Elbow',             14.52, 0, 100),
    ("RT","Round Trunk","RP-11A", '8" Round Tee',                16.05, 0, 110),
    ("RT","Round Trunk","RP-12A", '10" Round Tee',               24.05, 0, 120),
    ("RT","Round Trunk","RP-13A", '12" Round Tee',               28.50, 0, 130),
    ("RT","Round Trunk","RP-14A", '14" Round Tee',               38.40, 0, 140),
    ("RT","Round Trunk","RP-15A", '16" Round Tee',               65.25, 0, 150),
    ("RT","Round Trunk","RP-16A", '16" x 14" Reducer',           10.92, 0, 160),
    ("RT","Round Trunk","RP-17A", '14" x 12" Reducer',           10.13, 0, 170),
    ("RT","Round Trunk","RP-18A", '12" x 10" Reducer',            4.80, 0, 180),
    ("RT","Round Trunk","RP-19A", '10" x 8" Reducer',             4.80, 0, 190),
    ("RT","Round Trunk","RP-20",  '8" x 6" Reducer',              3.96, 0, 200),

    # ── DT: DB Triangles & Return Air Pans ───────────────────
    ("DT","DB Triangles & RA Pans","1A-DBTRI-S",  "Small 16x16x14 Ductboard Triangle",             43.66, 0,  10),
    ("DT","DB Triangles & RA Pans","1B-DBTRI-L",  "Large 22x22x18 Ductboard Triangle",             60.41, 0,  20),
    ("DT","DB Triangles & RA Pans","1C-MRP12NI",  "Metal Return Air Pan 12x12 Non-Insulated",       6.69, 0,  30),
    ("DT","DB Triangles & RA Pans","1D-MRP14NI",  "Metal Return Air Pan 14x14 Non-Insulated",       8.23, 0,  40),
    ("DT","DB Triangles & RA Pans","1E-MRP16NI",  "Metal Return Air Pan 16x16 Non-Insulated",      10.01, 0,  50),
    ("DT","DB Triangles & RA Pans","1F-MRP18NI",  "Metal Return Air Pan 18x18 Non-Insulated",      12.00, 0,  60),
    ("DT","DB Triangles & RA Pans","1G-MRP20NI",  "Metal Return Air Pan 20x20 Non-Insulated",      14.21, 0,  70),
    ("DT","DB Triangles & RA Pans","1H-MRP24NI",  "Metal Return Air Pan 24x24 Non-Insulated",      19.30, 0,  80),
    ("DT","DB Triangles & RA Pans","1I-MRP12I",   "Metal Return Air Pan 12x12 Insulated",           6.69, 0,  90),
    ("DT","DB Triangles & RA Pans","1J-MRP14I",   "Metal Return Air Pan 14x14 Insulated",           8.23, 0, 100),
    ("DT","DB Triangles & RA Pans","1K-MRP16I",   "Metal Return Air Pan 16x16 Insulated",          10.01, 0, 110),
    ("DT","DB Triangles & RA Pans","1L-MRP18I",   "Metal Return Air Pan 18x18 Insulated",          12.00, 0, 120),
    ("DT","DB Triangles & RA Pans","1M-MRP20I",   "Metal Return Air Pan 20x20 Insulated",          14.21, 0, 130),
    ("DT","DB Triangles & RA Pans","1N-MRP24I",   "Metal Return Air Pan 24x24 Insulated",          19.30, 0, 140),
    ("DT","DB Triangles & RA Pans","1P-AT7",      '7" Air Tite',                                    3.18, 0, 150),
    ("DT","DB Triangles & RA Pans","1Q-AT8",      '8" Air Tite',                                    3.53, 0, 160),
    ("DT","DB Triangles & RA Pans","1R-AT10",     '10" Air Tite',                                   3.77, 0, 170),
    ("DT","DB Triangles & RA Pans","1S-AT12",     '12" Air Tite',                                   4.47, 0, 180),
    ("DT","DB Triangles & RA Pans","1T-AT14",     '14" Air Tite',                                   5.24, 0, 190),
    ("DT","DB Triangles & RA Pans","1U-AT16",     '16" Air Tite',                                   6.07, 0, 200),

    # ── SM: Sheet Metal (per-size LBF pricing, footage-run form) ─
    # per_kit=0, per_foot=LBF rate (user picks size, enters LBF footage)
    ("SM","Sheet Metal","SM-14", 'Sheet Metal Size 14',   0, 2.44, 10),
    ("SM","Sheet Metal","SM-15", 'Sheet Metal Size 15',   0, 2.60, 20),
    ("SM","Sheet Metal","SM-16", 'Sheet Metal Size 16',   0, 2.77, 30),
    ("SM","Sheet Metal","SM-17", 'Sheet Metal Size 17',   0, 2.94, 40),
    ("SM","Sheet Metal","SM-18", 'Sheet Metal Size 18',   0, 3.11, 50),
    ("SM","Sheet Metal","SM-19", 'Sheet Metal Size 19',   0, 3.39, 60),
    ("SM","Sheet Metal","SM-20", 'Sheet Metal Size 20',   0, 3.57, 70),
    ("SM","Sheet Metal","SM-21", 'Sheet Metal Size 21',   0, 3.74, 80),
    ("SM","Sheet Metal","SM-22", 'Sheet Metal Size 22',   0, 3.90, 90),
    ("SM","Sheet Metal","SM-23", 'Sheet Metal Size 23',   0, 4.07, 100),
    ("SM","Sheet Metal","SM-24", 'Sheet Metal Size 24',   0, 4.23, 110),
    ("SM","Sheet Metal","SM-25", 'Sheet Metal Size 25',   0, 4.41, 120),
    ("SM","Sheet Metal","SM-26", 'Sheet Metal Size 26',   0, 4.57, 130),
    ("SM","Sheet Metal","SM-27", 'Sheet Metal Size 27',   0, 4.73, 140),
    ("SM","Sheet Metal","SM-28", 'Sheet Metal Size 28',   0, 4.90, 150),
    ("SM","Sheet Metal","SM-29", 'Sheet Metal Size 29',   0, 6.45, 160),
    ("SM","Sheet Metal","SM-30", 'Sheet Metal Size 30',   0, 6.67, 170),
    ("SM","Sheet Metal","SM-31", 'Sheet Metal Size 31',   0, 6.88, 180),
    ("SM","Sheet Metal","SM-32", 'Sheet Metal Size 32',   0, 7.10, 190),
    ("SM","Sheet Metal","SM-33", 'Sheet Metal Size 33',   0, 7.30, 200),
    ("SM","Sheet Metal","SM-34", 'Sheet Metal Size 34',   0, 7.52, 210),
    ("SM","Sheet Metal","SM-35", 'Sheet Metal Size 35',   0, 7.73, 220),
    ("SM","Sheet Metal","SM-36", 'Sheet Metal Size 36',   0, 7.94, 230),
    ("SM","Sheet Metal","SM-37", 'Sheet Metal Size 37',   0, 8.16, 240),
    ("SM","Sheet Metal","SM-38", 'Sheet Metal Size 38',   0, 8.37, 250),
    ("SM","Sheet Metal","SM-39", 'Sheet Metal Size 39',   0, 8.59, 260),
    ("SM","Sheet Metal","SM-40", 'Sheet Metal Size 40',   0, 8.80, 270),
    ("SM","Sheet Metal","SM-41", 'Sheet Metal Size 41',   0, 9.00, 280),
    ("SM","Sheet Metal","SM-42", 'Sheet Metal Size 42',   0, 9.22, 290),
    ("SM","Sheet Metal","SM-43", 'Sheet Metal Size 43',   0, 9.43, 300),
    ("SM","Sheet Metal","SM-44", 'Sheet Metal Size 44',   0, 9.64, 310),
    ("SM","Sheet Metal","SM-45", 'Sheet Metal Size 45',   0, 9.85, 320),
    ("SM","Sheet Metal","SM-46", 'Sheet Metal Size 46',   0, 10.07, 330),
    ("SM","Sheet Metal","SM-47", 'Sheet Metal Size 47',   0, 10.28, 340),
    ("SM","Sheet Metal","SM-48", 'Sheet Metal Size 48',   0, 10.49, 350),
    ("SM","Sheet Metal","SM-49", 'Sheet Metal Size 49',   0, 10.69, 360),
    ("SM","Sheet Metal","SM-50", 'Sheet Metal Size 50',   0, 14.70, 370),
    ("SM","Sheet Metal","SM-51", 'Sheet Metal Size 51',   0, 15.00, 380),

    # ── FD: Flex Duct (per-foot pricing, footage-run form) ───
    # per_kit=0, per_foot=bid price (user picks size, enters footage)
    ("FD","Flex Duct","FD-4",  '4" Flex Duct (per ft)',   0, 0.79, 10),
    ("FD","Flex Duct","FD-5",  '5" Flex Duct (per ft)',   0, 0.86, 20),
    ("FD","Flex Duct","FD-6",  '6" Flex Duct (per ft)',   0, 0.92, 30),
    ("FD","Flex Duct","FD-7",  '7" Flex Duct (per ft)',   0, 1.01, 40),
    ("FD","Flex Duct","FD-8",  '8" Flex Duct (per ft)',   0, 1.13, 50),
    ("FD","Flex Duct","FD-10", '10" Flex Duct (per ft)',  0, 1.37, 60),
    ("FD","Flex Duct","FD-12", '12" Flex Duct (per ft)',  0, 1.68, 70),
    ("FD","Flex Duct","FD-14", '14" Flex Duct (per ft)',  0, 2.07, 80),
    ("FD","Flex Duct","FD-16", '16" Flex Duct (per ft)',  0, 2.40, 90),

    # ── FR: Flex Runs — R8 Insulated + Foil Connectors ───────
    ("FR","Flex Runs","1A-R8FD", '4"x14\' R8 Insulated Flex',   28.40, 0,  10),
    ("FR","Flex Runs","1B-R8FD", '4"x18\' R8 Insulated Flex',   28.40, 0,  20),
    ("FR","Flex Runs","1C-R8FD", '5"x14\' R8 Insulated Flex',   30.87, 0,  30),
    ("FR","Flex Runs","1D-R8FD", '5"x18\' R8 Insulated Flex',   30.87, 0,  40),
    ("FR","Flex Runs","1E-R8FD", '6"x14\' R8 Insulated Flex',   32.97, 0,  50),
    ("FR","Flex Runs","1F-R8FD", '6"x18\' R8 Insulated Flex',   32.97, 0,  60),
    ("FR","Flex Runs","1G-R8FD", '7"x14\' R8 Insulated Flex',   36.28, 0,  70),
    ("FR","Flex Runs","1H-R8FD", '7"x18\' R8 Insulated Flex',   36.28, 0,  80),
    ("FR","Flex Runs","1I-R8FD", '8"x14\' R8 Insulated Flex',   40.43, 0,  90),
    ("FR","Flex Runs","1J-R8FD", '8"x18\' R8 Insulated Flex',   40.43, 0, 100),
    ("FR","Flex Runs","1K-R8FD", '10"x14\' R8 Insulated Flex',  49.14, 0, 110),
    ("FR","Flex Runs","1L-R8FD", '10"x18\' R8 Insulated Flex',  49.14, 0, 120),
    ("FR","Flex Runs","1M-R8FD", '12"x14\' R8 Insulated Flex',  60.27, 0, 130),
    ("FR","Flex Runs","1N-R8FD", '12"x18\' R8 Insulated Flex',  60.27, 0, 140),
    ("FR","Flex Runs","1O-R8FD", '14"x14\' R8 Insulated Flex',  74.13, 0, 150),
    ("FR","Flex Runs","1P-R8FD", '14"x18\' R8 Insulated Flex',  74.13, 0, 160),
    ("FR","Flex Runs","1Q-R8FD", '16"x14\' R8 Insulated Flex',  85.94, 0, 170),
    ("FR","Flex Runs","1R-R8FD", '16"x18\' R8 Insulated Flex',  85.94, 0, 180),
    ("FR","Flex Runs","1S-R8FD", '16"x25\' R8 Insulated Flex', 113.93, 0, 190),
    ("FR","Flex Runs","2A-AFC",  '3"x14 Aluminum Foil Connector',   5.99, 0, 200),
    ("FR","Flex Runs","2B-AFC",  '4"x14 Aluminum Foil Connector',   6.77, 0, 210),
    ("FR","Flex Runs","2C-AFC",  '5"x7 Aluminum Foil Connector',    3.99, 0, 220),
    ("FR","Flex Runs","2D-AFC",  '6"x7 Aluminum Foil Connector',    4.12, 0, 230),
    ("FR","Flex Runs","2E-AFC",  '7"x7 Aluminum Foil Connector',    4.48, 0, 240),
    ("FR","Flex Runs","2F-AFC",  '8"x7 Aluminum Foil Connector',    5.36, 0, 250),
    ("FR","Flex Runs","2G-AFC",  '10"x14 Aluminum Foil Connector', 13.86, 0, 260),
    ("FR","Flex Runs","2H-AFC",  '12"x14 Aluminum Foil Connector', 17.75, 0, 270),
    ("FR","Flex Runs","2I-AFC",  '14"x14 Aluminum Foil Connector', 21.05, 0, 280),

    # ── WC: Wall Caps & Roof Jacks ───────────────────────────
    ("WC","Wall Caps & Roof Jacks","A-4WCLP",   'Wall Cap 4" Louvered Plastic',                    2.15, 0,  10),
    ("WC","Wall Caps & Roof Jacks","B-4WCSP",   'Wall Cap 4" Screened Plastic (Bird Cage)',         4.19, 0,  20),
    ("WC","Wall Caps & Roof Jacks","C-4WCA",    'Wall Cap 4" Aluminum',                             4.78, 0,  30),
    ("WC","Wall Caps & Roof Jacks","D-4WCSLA",  'Wall Cap 4" Spring Loaded Aluminum',               9.96, 0,  40),
    ("WC","Wall Caps & Roof Jacks","E-4SAG",    'Wall Cap 4" Small Animal Guard',                  11.37, 0,  50),
    ("WC","Wall Caps & Roof Jacks","F-4885BL",  'Wall Cap 4" Broan 885BL Heavy Duty',              26.51, 0,  60),
    ("WC","Wall Caps & Roof Jacks","G-4WCSFA",  'Wall Cap 4" Screened Fresh Air',                  14.75, 0,  70),
    ("WC","Wall Caps & Roof Jacks","H-4W023",   'Wall Cap 4" Wicker 023',                          17.15, 0,  80),
    ("WC","Wall Caps & Roof Jacks","I-4WCBE",   'Wall Cap 4" Builder Edge Plastic',                17.15, 0,  90),
    ("WC","Wall Caps & Roof Jacks","J-6WCLP",   'Wall Cap 6" Louvered Plastic',                     5.16, 0, 100),
    ("WC","Wall Caps & Roof Jacks","K-6WCPFA",  'Wall Cap 6" Screened Plastic Fresh Air',           5.12, 0, 110),
    ("WC","Wall Caps & Roof Jacks","L-6WCSFA",  'Wall Cap 6" Screened Fresh Air',                  13.62, 0, 120),
    ("WC","Wall Caps & Roof Jacks","M-6WCSLA",  'Wall Cap 6" Spring Loaded Aluminum',              16.70, 0, 130),
    ("WC","Wall Caps & Roof Jacks","N-6834BL",  'Wall Cap 6" Broan 843BL Heavy Duty',              48.35, 0, 140),
    ("WC","Wall Caps & Roof Jacks","O-6W023",   'Wall Cap 6" Wicker 023',                          39.23, 0, 150),
    ("WC","Wall Caps & Roof Jacks","P-6WCBE",   'Wall Cap 6" Builders Edge Plastic',               39.23, 0, 160),
    ("WC","Wall Caps & Roof Jacks","Q-8WCS",    'Wall Cap 8" Screened Fresh Air',                  17.29, 0, 170),
    ("WC","Wall Caps & Roof Jacks","R-8WCA",    'Wall Cap 8" Aluminum Upgrade Hood',               18.65, 0, 180),
    ("WC","Wall Caps & Roof Jacks","S-10WCSFA", 'Wall Cap 10" Screened Fresh Air',                 22.40, 0, 190),
    ("WC","Wall Caps & Roof Jacks","T-10WCA",   'Wall Cap 10" Aluminum Upgrade Hood',              81.40, 0, 200),
    ("WC","Wall Caps & Roof Jacks","U-10X3WCA", 'Wall Cap 10x3-1/4" Aluminum',                    20.15, 0, 210),
    ("WC","Wall Caps & Roof Jacks","V-4RJ109",  'Roof Jack 4x4 w/Damper #L109NS',                 13.49, 0, 220),
    ("WC","Wall Caps & Roof Jacks","W-4RJ636",  'Roof Jack 4" Broan #636C Black',                 26.51, 0, 230),
    ("WC","Wall Caps & Roof Jacks","X-6RJB730", 'Roof Jack 6" Black Aluminum',                    17.17, 0, 240),
    ("WC","Wall Caps & Roof Jacks","Y-6RJ116",  'Roof Jack 6" Gooseneck w/Screen',                25.36, 0, 250),
    ("WC","Wall Caps & Roof Jacks","Z-6RJ634M", 'Roof Jack 6" Steel Black w/Damper',              47.96, 0, 260),
    ("WC","Wall Caps & Roof Jacks","ZA-8RJB750",'Roof Jack 8" Black Aluminum',                    23.82, 0, 270),
    ("WC","Wall Caps & Roof Jacks","ZB-8RJ634", 'Roof Jack 8" Steel Black w/Damper',              36.58, 0, 280),
    ("WC","Wall Caps & Roof Jacks","ZC-10RJB",  'Roof Jack 10" Black Aluminum',                   31.02, 0, 290),
]

# These expand existing category S (was "Transfer Grill", now "Registers & Grills")
S_EXPANSION = [
    ("S","Registers & Grills","CA-01",   "Combustion Air Tight (Interior, 2 Grills Hi/Low)",  8.16, 0,  20),
    ("S","Registers & Grills","RAG-01",  'Return Air Grill thru 18" Horizontal',              4.24, 0,  30),
    ("S","Registers & Grills","RAG-01A", 'Return Air Grill thru 14" Vertical',                8.65, 0,  40),
    ("S","Registers & Grills","RAG-02",  'Return Air Grill thru 30" Horizontal',             14.58, 0,  50),
    ("S","Registers & Grills","RAG-03",  'Filter Grill w/Filter thru 18" Horizontal',        10.67, 0,  60),
    ("S","Registers & Grills","RAG-03A", 'Filter Grill w/Filter thru 20" Vertical',          29.98, 0,  70),
    ("S","Registers & Grills","RAG-04",  'Filter Grill w/Filter thru 24" Horizontal',        21.48, 0,  80),
    ("S","Registers & Grills","RAG-05",  '12x6 Transfer Grill w/Hexacomb',                   25.35, 0,  90),
]


def seed():
    db = SessionLocal()
    try:
        added = 0

        # Add new categories (skip if already present)
        new_codes = set(v[0] for v in NEW_VARIANTS)
        existing_codes = set(
            r[0] for r in db.query(KitVariant.category_code)
                            .filter(KitVariant.category_code.in_(new_codes))
                            .distinct()
                            .all()
        )

        for code in sorted(new_codes):
            if code in existing_codes:
                count = db.query(KitVariant).filter_by(category_code=code).count()
                print(f"  Category {code} already exists ({count} variants). Skipping.")
                continue

            variants = [v for v in NEW_VARIANTS if v[0] == code]
            for (cat_code, cat_name, var_code, var_name, per_kit, per_foot, sort) in variants:
                db.add(KitVariant(
                    category_code=cat_code,
                    category_name=cat_name,
                    variant_code=var_code,
                    variant_name=var_name,
                    per_kit=per_kit,
                    per_foot=per_foot,
                    markup_divisor=1.0,
                    sort_order=sort,
                    active=True,
                ))
                added += 1
            print(f"  Added {len(variants)} variants for category {code} ({variants[0][1]})")

        # Expand category S with RA/CA grill data
        existing_s_codes = set(
            r[0] for r in db.query(KitVariant.variant_code)
                            .filter_by(category_code='S')
                            .all()
        )
        s_added = 0
        for (cat_code, cat_name, var_code, var_name, per_kit, per_foot, sort) in S_EXPANSION:
            if var_code in existing_s_codes:
                continue
            db.add(KitVariant(
                category_code=cat_code,
                category_name=cat_name,
                variant_code=var_code,
                variant_name=var_name,
                per_kit=per_kit,
                per_foot=per_foot,
                markup_divisor=1.0,
                sort_order=sort,
                active=True,
            ))
            s_added += 1
            added += 1

        # Update existing S category name
        db.query(KitVariant).filter_by(category_code='S').update(
            {"category_name": "Registers & Grills"}
        )

        if s_added:
            print(f"  Added {s_added} variants to category S (Registers & Grills)")
        else:
            print(f"  Category S expansion already done. Skipping.")

        db.commit()
        print(f"\nDone. Added {added} total new variants.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
