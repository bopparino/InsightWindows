"""
Seeds default kit pricing items.
Run once after init_db.py:
    python db/seed_kit_items.py

Prices are placeholders — update via the Kit Pricing admin page
or directly in pgAdmin once real rates are confirmed.

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
    ("sheet_metal", "Sheet metal fabrication — supply plenum",       150.00, 25.00, "each", 10),
    ("sheet_metal", "Sheet metal fabrication — return plenum",       120.00, 20.00, "each", 20),
    ("sheet_metal", "Sheet metal fabrication — transitions/offsets",  75.00, 10.00, "each", 30),
    ("flex_line",   "Flex duct (per zone)",                           80.00, 12.00, "zone", 40),
    ("flex_line",   "Flex duct connectors / clamps",                  25.00,  0.00, "each", 50),
    ("refrigerant", "Refrigerant line set — copper",                 110.00, 18.00, "each", 60),
    ("refrigerant", "Refrigerant line set insulation (Rubatex)",      40.00,  6.00, "each", 70),
    ("refrigerant", "Service valve locking caps",                     15.00,  0.00, "set",  80),
    ("drain",       "Condensate drain line — PVC",                    45.00,  0.00, "each", 90),
    ("drain",       "Float switch",                                   35.00,  0.00, "each", 100),
    ("drain",       "Condensate pump (if required)",                  85.00,  0.00, "each", 110),
    ("mastic",      "Mastic duct sealing package",                    50.00,  8.00, "each", 120),
    ("mastic",      "Mastic — fittings and boots",                    30.00,  0.00, "each", 130),
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
