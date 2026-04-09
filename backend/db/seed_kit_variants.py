"""
Seeds KitVariant table with real 2019 master prices.

Source: MASTER PRICES New 2019.xls, Section P (Fixed and Miscellaneous Charts).
All bid prices are selling prices (what the builder pays).

Run from backend/:
    python db/seed_kit_variants.py

Safe to re-run — skips seeding if any variants already exist.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from core.database import SessionLocal, engine
from models.models import Base, KitVariant

Base.metadata.create_all(bind=engine)

# (category_code, category_name, variant_code, variant_name, per_kit, per_foot, markup_divisor, sort_order)
# per_kit  = flat bid price per item
# per_foot = additional cost per linear foot (0 if not footage-based)
# markup_divisor = 1.0 means no embedded margin; <1.0 means item carries its own markup
VARIANTS = [

    # ── A: Sheet Metal Runs (fabricated) ──────────────────────────────
    # Priced per foot using $1.55/lb steel + $0.48 labor + $0.31 delivery = $1.525/sqft shop cost
    # Common run sizes from the old fixed chart — approximate bid price per run
    ("A", "Sheet Metal Runs", "4SMR",  '4" Sheet Metal Run (10 ft)',  29.46, 0, 1.0, 10),
    ("A", "Sheet Metal Runs", "5SMR",  '5" Sheet Metal Run (13 ft)',  38.09, 0, 1.0, 20),
    ("A", "Sheet Metal Runs", "6SMR",  '6" Sheet Metal Run (13 ft)',  43.48, 0, 1.0, 30),
    ("A", "Sheet Metal Runs", "7SMR",  '7" Sheet Metal Run (13 ft)',  57.16, 0, 1.0, 40),
    ("A", "Sheet Metal Runs", "8SMR",  '8" Sheet Metal Run (5 ft)',   34.45, 0, 1.0, 50),
    ("A", "Sheet Metal Runs", "10SMR", '10" Sheet Metal Run (5 ft)',  45.90, 0, 1.0, 60),
    ("A", "Sheet Metal Runs", "12SMR", '12" Sheet Metal Run (5 ft)',  57.38, 0, 1.0, 70),

    # ── B: Ductboard Runs (R-8) ────────────────────────────────────────
    # $1.57/sqft bid price for ductboard (Section P: DUCTBOARD = $1.57/sqft)
    ("B", "Ductboard Runs (R8)", "4DBR",  '4" Ductboard Run (10 ft, R-8)',   19.89, 0, 1.0, 10),
    ("B", "Ductboard Runs (R8)", "6DBR",  '6" Ductboard Run (13 ft, R-8)',   24.37, 0, 1.0, 20),
    ("B", "Ductboard Runs (R8)", "8DBR",  '8" Ductboard Run (10 ft, R-8)',   50.24, 0, 1.0, 30),
    ("B", "Ductboard Runs (R8)", "10DBR", '10" Ductboard Run (10 ft, R-8)',  62.80, 0, 1.0, 40),
    ("B", "Ductboard Runs (R8)", "12DBR", '12" Ductboard Run (10 ft, R-8)',  75.36, 0, 1.0, 50),

    # ── C: Exhaust Runs ────────────────────────────────────────────────
    # PVC flue dual pipe (2019 fixed chart — Section P)
    ("C", "Exhaust Runs", "PVC2X21", 'PVC Flue Dual Pipe 2" x 21\' thru Roof', 171.09, 0, 1.0, 10),
    ("C", "Exhaust Runs", "PVC2X31", 'PVC Flue Dual Pipe 2" x 31\' thru Roof', 183.13, 0, 1.0, 20),
    ("C", "Exhaust Runs", "PVC2X41", 'PVC Flue Dual Pipe 2" x 41\' thru Roof', 196.96, 0, 1.0, 30),
    ("C", "Exhaust Runs", "PVC3X21", 'PVC Flue Dual Pipe 3" x 21\' thru Roof', 226.70, 0, 1.0, 40),
    ("C", "Exhaust Runs", "PVC3X31", 'PVC Flue Dual Pipe 3" x 31\' thru Roof', 255.57, 0, 1.0, 50),
    ("C", "Exhaust Runs", "PVC3X41", 'PVC Flue Dual Pipe 3" x 41\' thru Roof', 289.44, 0, 1.0, 60),

    # ── D: Class B Flues (by the foot) ────────────────────────────────
    # Section P: FLUES 4=$9.83/ft, 5=$11.78/ft, 6=$19.54/ft
    ("D", "Class B Flues", "FLUES4FT", '4" Class B Flue (per ft)',  9.83, 0, 1.0, 10),
    ("D", "Class B Flues", "FLUES5FT", '5" Class B Flue (per ft)', 11.78, 0, 1.0, 20),
    ("D", "Class B Flues", "FLUES6FT", '6" Class B Flue (per ft)', 19.54, 0, 1.0, 30),

    # ── E: B Vent Connectors (miscl chart 01-04) ──────────────────────
    # Section P miscellaneous chart items 01-04
    ("E", "B Vent Connectors", "01", '4" B Vent Connector — Townhouse Furnace',       121.08, 0, 1.0, 10),
    ("E", "B Vent Connectors", "02", '4" B Vent Connector — Townhouse HWH',           129.88, 0, 1.0, 20),
    ("E", "B Vent Connectors", "03", '4" B Vent Connector — Single Family Furnace',   130.71, 0, 1.0, 30),
    ("E", "B Vent Connectors", "04", '4" B Vent Connector — Single Family HWH',       183.45, 0, 1.0, 40),

    # ── F: Combustion Air ─────────────────────────────────────────────
    # Standard combustion air kit (no fixed chart price — placeholder)
    ("F", "Combustion Air", "COMBAIR", 'Combustion Air Kit', 85.00, 0, 1.0, 10),

    # ── G: PVC Flues (per foot) ───────────────────────────────────────
    # Refrigeration lines: REF LINES = $5.233/ft standard, $12.65/ft for 1-1/8" only
    ("G", "PVC Flues", "REFLINES",    'Refrigerant Lines — copper (per ft)',          5.23, 0, 1.0, 10),
    ("G", "PVC Flues", "REFLINES118", 'Refrigerant Lines — 1-1/8" copper (per ft)',  12.65, 0, 1.0, 20),

    # ── H: Condensate Drain ───────────────────────────────────────────
    # Section P: CDA attic=$39.11, CDB basement=$11.68
    ("H", "Condensate Drain", "CDA", 'Condensate Drain — Attic (A)',     39.11, 0, 1.0, 10),
    ("H", "Condensate Drain", "CDB", 'Condensate Drain — Basement (B)',  11.68, 0, 1.0, 20),

    # ── I: Condensate Pump ────────────────────────────────────────────
    # Section P item 11A: CP1=$139.03
    ("I", "Condensate Pump", "CP1", 'Condensate Pump (full assembly)', 139.03, 0, 1.0, 10),

    # ── J: Control Wiring ────────────────────────────────────────────
    # Section P: CONTROL WIRING 20/10 = $46.76
    ("J", "Control Wiring", "CTRLWIRE", 'Control Wiring 20/10', 46.76, 0, 1.0, 10),

    # ── K: Copper Line Sets ───────────────────────────────────────────
    # REF LINES per foot, common pre-cut sizes
    ("K", "Copper Line Sets", "LS25",  'Line Set 25 ft (3/8 x 3/4)',  130.83, 0, 1.0, 10),
    ("K", "Copper Line Sets", "LS35",  'Line Set 35 ft (3/8 x 3/4)',  183.16, 0, 1.0, 20),
    ("K", "Copper Line Sets", "LS50",  'Line Set 50 ft (3/8 x 3/4)',  261.65, 0, 1.0, 30),

    # ── L: Equipment Mounting Kits (miscl chart 05-07) ────────────────
    # Section P items 05-07
    ("L", "Equipment Mounting Kits", "EMKV1", 'EQ Mounting Kit Vertical 31x31',  52.07, 0, 1.0, 10),
    ("L", "Equipment Mounting Kits", "EMKV2", 'EQ Mounting Kit Vertical 31x36',  53.59, 0, 1.0, 20),
    ("L", "Equipment Mounting Kits", "EMKH3", 'EQ Mounting Kit Horizontal 31x60', 61.85, 0, 1.0, 30),

    # ── M: Humidifiers (miscl chart 10-11) ───────────────────────────
    # Section P items 10-11
    ("M", "Humidifiers", "AA600", 'Aprilaire Model 600 Humidifier', 312.22, 0, 1.0, 10),
    ("M", "Humidifiers", "AA700", 'Aprilaire Model 700 Humidifier', 424.22, 0, 1.0, 20),

    # ── N: Air Cleaners (miscl chart 12-17) ──────────────────────────
    # Section P items 12-17
    ("N", "Air Cleaners", "HE1400",    'Trion Electronic HE1400 16x25',         956.36, 0, 1.0, 10),
    ("N", "Air Cleaners", "HE2000",    'Trion Electronic HE2000 20x25',         979.68, 0, 1.0, 20),
    ("N", "Air Cleaners", "HF100F2002",'HYW Media HF100F2002 16x25',            161.10, 0, 1.0, 30),
    ("N", "Air Cleaners", "HF100F2010",'HYW Media HF100F2010 20x25',            161.10, 0, 1.0, 40),
    ("N", "Air Cleaners", "HCC1628",   'Lennox Media HCC16-28 w/HCXF16 MERV',  400.00, 0, 1.0, 50),
    ("N", "Air Cleaners", "HCC2028",   'Lennox Media HCC20-28 w/HCXF20 MERV',  550.00, 0, 1.0, 60),
    ("N", "Air Cleaners", "HF300E1019",'HYW Electronic HF300E1019 16x25',      1027.55, 0, 1.0, 70),
    ("N", "Air Cleaners", "HF300E1035",'HYW Electronic HF300E1035 20x25',      1122.96, 0, 1.0, 80),
    ("N", "Air Cleaners", "ABGRAY16",  'Trion Air Bear Media 16x25 w/Filter',    43.12, 0, 1.0, 90),
    ("N", "Air Cleaners", "ABGRAY20",  'Trion Air Bear Media 20x25 w/Filter',    43.12, 0, 1.0, 100),

    # ── O: Energy Recovery Ventilator ────────────────────────────────
    # Section P item 18
    ("O", "Energy Recovery Ventilator", "ER200",  'HYW ERV ER200',                        2351.45, 0, 1.0, 10),
    ("O", "Energy Recovery Ventilator", "AA8145", 'Aprilaire Ventilation System Model 8145', 339.75, 0, 1.0, 20),

    # ── P: Duct Sealing ───────────────────────────────────────────────
    # Section P item 19: MASTIC = $125.65 (full job, not per ton)
    ("P", "Duct Sealing", "MASTIC", 'Mastic Duct Sealing Package', 125.65, 0, 1.0, 10),

    # ── Q: Laundry Chutes (miscl chart 20-21) ────────────────────────
    # Section P items 20-21
    ("Q", "Laundry Chutes", "LC1S", 'Laundry Chute 10x10 — One Story', 319.03, 0, 1.0, 10),
    ("Q", "Laundry Chutes", "LC2S", 'Laundry Chute 10x10 — Two Story', 417.57, 0, 1.0, 20),

    # ── R: Fresh-Air / Ventilation ───────────────────────────────────
    # Concentric termination kit + neutralizer (Section P)
    ("R", "Fresh-Air", "CONCENTRIC", 'Concentric Termination Kit',     39.60, 0, 1.0, 10),
    ("R", "Fresh-Air", "CN2220",     'Condensate Neutralizer CN2-220', 62.10, 0, 1.0, 20),

    # ── S: Transfer Grill ────────────────────────────────────────────
    # Section P: RETURN GRILL = $19.54
    ("S", "Transfer Grill", "RETGRILL", 'Return / Transfer Grill', 19.54, 0, 1.0, 10),

    # ── T: Zone Control Dampers (miscl chart 22-25A) ─────────────────
    # Section P items 22-25A
    ("T", "Zone Control Dampers", "AA6202ZC2",    'Aprilaire 6202 — 2 Zone / 2 Dampers',         890.84, 0, 1.0, 10),
    ("T", "Zone Control Dampers", "AA6203ZC3",    'Aprilaire 6203 — 3 Zone / 3 Dampers',        1305.31, 0, 1.0, 20),
    ("T", "Zone Control Dampers", "AA6303ZC23",   'Aprilaire 6303 — 2-3 Zone / 3 Dampers (HP)', 1365.22, 0, 1.0, 30),
    ("T", "Zone Control Dampers", "AA6404ZC4",    'Aprilaire 6404 — 4 Zone / 4 Dampers',        1743.12, 0, 1.0, 40),
    ("T", "Zone Control Dampers", "SYSTXCCITCO1", 'Carrier Infinity 4-Zone System',              3713.13, 0, 1.0, 50),
    ("T", "Zone Control Dampers", "EWC30002",     'EWC Model 3000-2 — 2 Zone / 2 Dampers',      1503.49, 0, 1.0, 60),
    ("T", "Zone Control Dampers", "EWC30003",     'EWC Model 3000-3 — 3 Zone / 3 Dampers',      2077.46, 0, 1.0, 70),
    ("T", "Zone Control Dampers", "EWC50004",     'EWC Model 5000-4 — 4 Zone / 4 Dampers',      2664.17, 0, 1.0, 80),

    # ── U: Miscellaneous Accessories ─────────────────────────────────
    # Section P items 26-29A + R-454B surcharge
    ("U", "Misc. Accessories", "TXV",        'TXV Valve',                              126.00, 0, 1.0, 10),
    ("U", "Misc. Accessories", "LPK",        'LP Kit',                                 128.00, 0, 1.0, 20),
    ("U", "Misc. Accessories", "SYW",        'Second Year Warranty',                   130.00, 0, 1.0, 30),
    ("U", "Misc. Accessories", "AK14",       'IPG Air Knight 14"',                     887.00, 0, 1.0, 40),
    ("U", "Misc. Accessories", "AK7",        'IPG Air Knight 7"',                      912.00, 0, 1.0, 50),
    ("U", "Misc. Accessories", "R454B",      'R-454B Refrigerant Surcharge',            42.90, 0, 1.0, 60),
    ("U", "Misc. Accessories", "16X25FR",    'Filter Rack 16x25 w/Filter',              16.62, 0, 1.0, 70),
    ("U", "Misc. Accessories", "20X25FR",    'Filter Rack 20x25 w/Filter',              16.80, 0, 1.0, 80),
    ("U", "Misc. Accessories", "SLABS",      'Polytex A/C Pads + Pump-Ups + Locking Caps', 42.52, 0, 1.0, 90),
    ("U", "Misc. Accessories", "WALLBRKT",   'Wall Brackets (36")',                    134.81, 0, 1.0, 100),
    ("U", "Misc. Accessories", "CTRLWIRE20", 'Control Wiring 20/10',                    46.76, 0, 1.0, 110),
]


def seed():
    db = SessionLocal()
    try:
        existing = db.query(KitVariant).count()
        if existing > 0:
            print(f"Kit variants already seeded ({existing} variants). Skipping.")
            print("To reseed, clear the kit_variants table first.")
            return

        for (cat_code, cat_name, var_code, var_name, per_kit, per_foot, markup_div, sort) in VARIANTS:
            db.add(KitVariant(
                category_code=cat_code,
                category_name=cat_name,
                variant_code=var_code,
                variant_name=var_name,
                per_kit=per_kit,
                per_foot=per_foot,
                markup_divisor=markup_div,
                sort_order=sort,
                active=True,
            ))
        db.commit()
        print(f"Seeded {len(VARIANTS)} kit variants across categories A-U.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
