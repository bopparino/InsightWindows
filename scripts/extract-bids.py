#!/usr/bin/env python3
"""Extract 2025+ bids from the Access backend (data.mdb) into a JSON bundle
for scripts/push-bids.mts (prod) or scripts/load-bids.mts (local).

Usage: python3 scripts/extract-bids.py <path-to-data.mdb> --out bundle.json

Needs mdbtools. Bidsheet rows are grouped into plans by PLAN_NBR; builder and
project attribution comes from each plan's latest Contract row. Rows edited
before 2025-01-01 are excluded by design (Austin: no pre-2025 history).
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
        return float(v or 0)
    except ValueError:
        return 0.0

argv = sys.argv[1:]
out_path = argv[argv.index("--out") + 1]
mdb = argv[0]

bidsheet = export(mdb, "Bidsheet")
contracts = export(mdb, "Contract")
builders = export(mdb, "Builder")
projects = export(mdb, "Project")

recent = [r for r in bidsheet if (r.get("EDIT_DATE") or "") >= CUTOFF]

# Latest contract row per plan (by CONT_DATE, then ENTRY_DATE).
latest = {}
for c in contracts:
    p = (c.get("PLAN_NBR") or "").strip()
    if not p:
        continue
    stamp = max(c.get("CONT_DATE") or "", c.get("ENTRY_DATE") or "", c.get("PROP_DATE") or "")
    if p not in latest or stamp > latest[p][0]:
        latest[p] = (stamp, c)

builder_names = { (b.get("BUILD_CODE") or "").strip(): (b.get("BUILD_NAME") or "").strip() for b in builders }
project_names = { (p.get("PROJ_CODE") or "").strip(): (p.get("PROJ_NAME") or "").strip() for p in projects }

plans = {}
for r in recent:
    pn = (r.get("PLAN_NBR") or "").strip()
    if not pn:
        continue
    plan = plans.setdefault(pn, {"plan_nbr": pn, "lines": []})
    plan["lines"].append({
        "house_nbr": (r.get("HOUSE_NBR") or "").strip(),
        "system_nbr": (r.get("SYSTEM_NBR") or "").strip(),
        "work_nbr": (r.get("WORK_NBR") or "").strip(),
        "house_type": (r.get("HOUSE_TYPE") or "").strip(),
        "part_nbr": (r.get("PART_NBR") or "").strip(),
        "part_cost": num(r.get("PART_CST")),
        "labor_hours": num(r.get("LABOR_HRS")),
        "labor_cost": num(r.get("LABOR_COS")),
        "factor": num(r.get("FACTOR")),
        "selling": num(r.get("TOTSELLING")),
        "final_total": num(r.get("FINALTOT")),
        "edit_date": (r.get("EDIT_DATE") or "").strip() or None,
        "data": {k: v for k, v in r.items() if (v or "").strip()},
    })

for pn, plan in plans.items():
    lines = plan["lines"]
    c = latest.get(pn, ("", {}))[1]
    bc = (c.get("BUILD_CODE") or "").strip()
    pc = (c.get("PROJ_CODE") or "").strip()
    plan["builder_code"] = bc
    plan["builder_name"] = (c.get("BUILD_NAME") or "").strip() or builder_names.get(bc, "")
    plan["proj_code"] = pc
    plan["proj_name"] = (c.get("PROJ_NAME") or "").strip() or project_names.get(pc, "")
    plan["proposed_at"] = (c.get("PROP_DATE") or "").strip() or None
    plan["contracted_at"] = (c.get("CONT_DATE") or "").strip() or None
    plan["total"] = round(sum(l["final_total"] for l in lines), 2)
    plan["edited_at"] = max((l["edit_date"] or "") for l in lines) or None
    types = []
    for l in lines:
        if l["house_type"] and l["house_type"] not in types:
            types.append(l["house_type"])
    plan["house_types"] = " · ".join(types)

bundle = {"plans": sorted(plans.values(), key=lambda p: p["edited_at"] or "", reverse=True)}
json.dump(bundle, open(out_path, "w"))
print(f"{len(bundle['plans'])} plans / {len(recent)} lines (2025+) -> {out_path}")
