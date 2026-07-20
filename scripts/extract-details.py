#!/usr/bin/env python3
"""Extract per-bid composition detail from the Access Bid * tables (the old
flow's boxes) for 2025+ plans: every picked item (QTY>0) and every geometry
row (feet>0). QTY-0 rows are the catalog-copy pattern - noise - and skipped.

Usage: python3 scripts/extract-details.py <data.mdb> --out details.json
Push with scripts/push-details.mts.
"""
import csv, io, json, subprocess, sys

CUTOFF = "2025-01-01"

def export(mdb, table):
    out = subprocess.run(
        ["mdb-export", "-b", "strip", "-D", "%Y-%m-%d", "-T", "%Y-%m-%d %H:%M:%S", mdb, table],
        capture_output=True, text=True, check=True).stdout
    return list(csv.DictReader(io.StringIO(out)))

def num(v):
    try:
        return float(v) if (v or "").strip() else 0.0
    except ValueError:
        return 0.0

argv = sys.argv[1:]
out_path = argv[argv.index("--out") + 1]
mdb = argv[0]

recent_plans = { (r.get("PLAN_NBR") or "").strip()
                 for r in export(mdb, "Bidsheet") if (r.get("EDIT_DATE") or "") >= CUTOFF }
print(f"{len(recent_plans)} plans in scope")

# (table, category, kind) — kind part: PART_NBR/QTY/COST rows · size: SIZE/QTY/ADDL FEET
#                            geom: Run Feet × H × W (sheet metal / duct board sheets)
TABLES = [
    ("Bid SheetMetal Sheets", "Sheet Metal Sheets", "geom"),
    ("Bid Runs", "Sheet Metal Runs", "size"),
    ("Bid Duct Board", "Duct Board Sheets", "geom"),
    ("Bid Duct Board Runs", "Duct Board Runs", "size"),
    ("Bid Flex", "Flex Runs", "size"),
    ("Bid Flex Runs", "Flex Runs w/ Hardware", "part"),
    ("Bid ExhaustRuns", "Exhaust Runs", "part"),
    ("Bid Fans", "Fans", "part"),
    ("Bid FA Dampers", "FA Dampers", "part"),
    ("Bid RAandCAGrills", "RA & CA Grills", "part"),
    ("Bid WallCapAndRoofJack", "Wall Caps & Roof Jacks", "part"),
    ("Bid DBTrianglesAndReturnAirPans", "DB Triangles & RA Pans", "part"),
    ("Bid RoundPipe", "Round Pipe", "part"),
    ("Bid Miscl", "Miscellaneous", "part"),
    ("Bid Stats", "Stats", "part"),
]

def g(r, *names):
    for nm in names:
        if nm in r:
            return r[nm]
    return ""

details = []
for table, category, kind in TABLES:
    rows = export(mdb, table)
    kept = 0
    for r in rows:
        plan = (g(r, "PLAN_NBR", "Plan_Nbr", "Plan_nbr") or "").strip()
        if plan not in recent_plans:
            continue
        house = (g(r, "HOUSE_NBR", "House_nbr") or "").strip()
        system = (g(r, "SYSTEM_NBR", "System_nbr") or "").strip()
        if kind == "geom":
            feet = num(g(r, "Run Feet"))
            if feet <= 0:
                continue
            details.append({
                "plan_nbr": plan, "house_nbr": house, "system_nbr": system,
                "category": category, "code": "", "label": "",
                "qty": 0, "unit_cost": 0,
                "feet": feet, "height": num(r.get("mHeight")), "width": num(r.get("mWidth")),
                "insulated": 1 if num(r.get("Insulated")) else 0,
            })
        elif kind == "size":
            qty = num(r.get("QTY"))
            addl = num(r.get("ADDL FEET"))
            if qty <= 0 and addl <= 0:
                continue
            details.append({
                "plan_nbr": plan, "house_nbr": house, "system_nbr": system,
                "category": category, "code": (r.get("SIZE") or "").strip(), "label": "",
                "qty": qty, "unit_cost": 0,
                "feet": addl, "height": 0, "width": 0,
                "insulated": 1 if num(r.get("INSULATED")) else 0,
            })
        else:
            qty = num(r.get("QTY"))
            if qty <= 0:
                continue
            details.append({
                "plan_nbr": plan, "house_nbr": house, "system_nbr": system,
                "category": category, "code": (r.get("PART_NBR") or "").strip(),
                "label": (r.get("DESC") or "").strip().replace("\n", " "),
                "qty": qty, "unit_cost": num(r.get("PART_COST")),
                "feet": 0, "height": 0, "width": 0, "insulated": 0,
            })
        kept += 1
    print(f"{table}: kept {kept}")

json.dump({"details": details}, open(out_path, "w"))
print(f"{len(details)} detail lines -> {out_path}")
