"""
Seeds default kit pricing items (KitCalculator / KitPicker component).

Source: MASTER PRICES New 2019.xls, Section P fixed chart.
All prices are selling prices (what the builder pays).

Run once after init_db.py:
    python db/seed_kit_items.py

base_price    = flat charge regardless of system size
price_per_ton = additional charge per ton of cooling capacity
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from core.database import SessionLocal
from models.models import Base, KitItem
from core.database import engine

Base.metadata.create_all(bind=engine)

DEFAULTS = [
    # category, description, base_price, price_per_ton, unit, sort_order
    # Sheet metal — plenum packages from Section O3 XLS
    ("sheet_metal", "Sheet metal fabrication — supply plenum",         71.12,  0.00, "each", 10),
    ("sheet_metal", "Sheet metal fabrication — return plenum",         47.72,  0.00, "each", 20),
    ("sheet_metal", "Sheet metal fabrication — transitions/offsets",   30.00,  0.00, "each", 30),
    # Flex duct
    ("flex_line",   "Flex duct (per zone)",                            65.00,  0.00, "zone", 40),
    ("flex_line",   "Flex duct connectors / clamps",                   18.00,  0.00, "each", 50),
    # Refrigerant — REF LINES $5.233/ft; standard 25 ft run = $130.83
    ("refrigerant", "Refrigerant line set — copper",                  130.83,  0.00, "each", 60),
    ("refrigerant", "Refrigerant line set insulation (Rubatex)",       32.00,  0.00, "each", 70),
    ("refrigerant", "Service valve locking caps",                      42.52,  0.00, "set",  80),
    # Drain — Section P: CDA attic=$39.11, CDB basement=$11.68
    ("drain",       "Condensate drain line — PVC (attic)",             39.11,  0.00, "each", 90),
    ("drain",       "Condensate drain line — PVC (basement)",          11.68,  0.00, "each", 95),
    ("drain",       "Float switch (L599122)",                          13.99,  0.00, "each", 100),
    ("drain",       "Condensate pump — CP1 (full assembly)",          139.03,  0.00, "each", 110),
    # Mastic — Section P item 19: $125.65 flat per job
    ("mastic",      "Mastic duct sealing package",                    125.65,  0.00, "each", 120),
    ("mastic",      "Mastic — fittings and boots",                     35.00,  0.00, "each", 130),
]


def seed():
    db = SessionLocal()
    try:
        existing = db.query(KitItem).count()
        if existing > 0:
            print(f"Kit items already seeded ({existing} items). Skipping.")
            return
        for cat, desc, base, per_ton, unit, sort in DEFAULTS:
            db.add(KitItem(
                category=cat,
                description=desc,
                base_price=base,
                price_per_ton=per_ton,
                unit=unit,
                sort_order=sort,
            ))
        db.commit()
        print(f"Seeded {len(DEFAULTS)} kit items.")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
