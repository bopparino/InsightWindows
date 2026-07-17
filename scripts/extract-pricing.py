#!/usr/bin/env python3
"""Extract the pricing layer from data.mdb: kit charts (…cht tables), the
Part component price table, and the Eqcomp bundle map.

Usage: python3 scripts/extract-pricing.py <path-to-data.mdb> --out pricing.json
Push with scripts/push-pricing.mts.
"""
import csv, io, json, subprocess, sys

def export(mdb, table):
    out = subprocess.run(
        ["mdb-export", "-b", "strip", "-D", "%Y-%m-%d", "-T", "%Y-%m-%d %H:%M:%S", mdb, table],
        capture_output=True, text=True, check=True).stdout
    return list(csv.DictReader(io.StringIO(out)))

def num(v):
    try:
        return float(v) if (v or "").strip() else None
    except ValueError:
        return None

argv = sys.argv[1:]
out_path = argv[argv.index("--out") + 1]
mdb = argv[0]

# (access table, display category, kind)
# kind: part = PART_NBR/DESC/PART_COST · size = SIZE/BID_PRICE(+ADD_FOOT)
#       misc = DESC/AMOUNT/PART_NBR · fixed = KEY/PRICE/DESC · chart = geometry
CHARTS = [
    ("Runscht", "Sheet Metal Runs", "size"),
    ("RunsDuctBoardCht", "Duct Board Runs", "size"),
    ("Flexcht", "Flex Runs", "size"),
    ("BidFlexRunsCht", "Flex Runs w/ Hardware (bid)", "part"),
    ("FlexRunsWithConnectingHardwarecht", "Flex Runs w/ Hardware", "part"),
    ("DBTrianglesAndReturnAirPansCht", "DB Triangles & RA Pans", "part"),
    ("RoundPipeCht", "Round Pipe", "part"),
    ("ExhaustRunCht", "Exhaust Runs", "part"),
    ("Fanscht", "Fans", "part"),
    ("FADampersCht", "FA Dampers", "part"),
    ("WallCapAndRoofJackcht", "Wall Caps & Roof Jacks", "part"),
    ("RAandCAGrills", "RA & CA Grills", "part"),
    ("StatsCht", "Stats", "part"),
    ("Misclcht", "Miscellaneous Kit", "misc"),
    ("Fixedcht", "Fixed Prices", "fixed"),
    ("Smcht", "Sheet Metal Chart (lbs/ft)", "chart"),
    ("DuctBoardCht", "Duct Board Chart (sqft)", "chart"),
]

kit_items = []
for table, category, kind in CHARTS:
    rows = export(mdb, table)
    for i, r in enumerate(rows):
        updated = (r.get("DATE PRICE UPDATED") or "").strip()[:10] or None
        extra = {k: v for k, v in r.items() if (v or "").strip()}
        if kind == "size":
            item = {"code": (r.get("SIZE") or "").strip(), "label": f'{(r.get("SIZE") or "").strip()}" {category.rstrip("s")}',
                    "price": num(r.get("BID_PRICE")), "per_foot": num(r.get("ADD_FOOT")), "is_chart": 0}
        elif kind == "part":
            item = {"code": (r.get("PART_NBR") or "").strip(), "label": (r.get("DESC") or "").strip(),
                    "price": num(r.get("PART_COST")), "per_foot": None, "is_chart": 0}
        elif kind == "misc":
            item = {"code": (r.get("PART_NBR") or "").strip(), "label": (r.get("DESC") or "").strip(),
                    "price": num(r.get("AMOUNT")), "per_foot": None, "is_chart": 0}
        elif kind == "fixed":
            item = {"code": (r.get("KEY") or "").strip(), "label": (r.get("DESC") or "").strip(),
                    "price": num(r.get("PRICE")), "per_foot": None, "is_chart": 0}
        else:  # chart
            item = {"code": (r.get("SIZE") or "").strip(), "label": "", "price": None, "per_foot": None, "is_chart": 1}
        if not item["code"]:
            continue
        item.update({"category": category, "extra": extra, "price_updated": updated, "sort": i * 10})
        kit_items.append(item)

parts = []
for r in export(mdb, "Part"):
    pn = (r.get("PART_NBR") or "").strip()
    if not pn:
        continue
    parts.append({
        "part_nbr": pn,
        "description": (r.get("DESC") or "").strip(),
        "cost": num(r.get("PART_COST")),
        "a_cost": num(r.get("A_COST")),
        "category": (r.get("CATEGORY") or "").strip(),
        "seer": (r.get("SEER") or "").strip(),
        "eqp_type": (r.get("EQP_TYPE") or "").strip(),
        "afue": (r.get("AFUE") or "").strip(),
    })

eqcomp = []
seen = set()
for r in export(mdb, "Eqcomp"):
    key = ((r.get("PART_NBR") or "").strip(), (r.get("COMP_NBR") or "").strip())
    if all(key) and key not in seen:
        seen.add(key)
        eqcomp.append({"part_nbr": key[0], "comp_nbr": key[1]})

bundle = {"kit_items": kit_items, "parts": parts, "eqcomp": eqcomp}
json.dump(bundle, open(out_path, "w"))
print(f"{len(kit_items)} kit items, {len(parts)} parts, {len(eqcomp)} bundle links -> {out_path}")
