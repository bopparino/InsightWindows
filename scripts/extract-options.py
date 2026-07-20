#!/usr/bin/env python3
"""Extract the Options & Standards hierarchy from data.mdb:
Master Options (company-wide) -> Builder Master Options -> Project Master
Options. Usage: python3 scripts/extract-options.py <data.mdb> --out options.json
Push with push-options.mts.
"""
import csv, io, json, subprocess, sys

def export(mdb, table):
    out = subprocess.run(["mdb-export", "-b", "strip", mdb, table], capture_output=True, text=True, check=True).stdout
    return list(csv.DictReader(io.StringIO(out)))

def num(v):
    try:
        return float(v) if (v or "").strip() else None
    except ValueError:
        return None

argv = sys.argv[1:]
out_path = argv[argv.index("--out") + 1]
mdb = argv[0]

options = []
for table, level, refcol in [("Master Options", "master", None),
                             ("Builder Master Options", "builder", "Build_code"),
                             ("Project Master Options", "project", "Proj_code")]:
    for r in export(mdb, table):
        num_ = (r.get("Option Number") or "").strip()
        if not num_:
            continue
        options.append({
            "level": level,
            "ref_code": (r.get(refcol) or "").strip() if refcol else "",
            "option_number": num_,
            "description": (r.get("DESC") or "").strip(),
            "part_nbr": (r.get("PART_NBR") or "").strip(),
            "std_price": num(r.get("Std_price") or r.get("std_price")),
            "opt_price": num(r.get("Opt_price") or r.get("opt_price")),
            "pwk_price": num(r.get("pwk_price")),
        })
json.dump({"options": options}, open(out_path, "w"))
print(f"{len(options)} option rows -> {out_path}")
