# Kit variant seed data — sourced from MASTER PRICES New 2019.xls Section P
# (category_code, category_name, variant_code, variant_name, per_kit, per_foot, sort_order)

VARIANTS = [
    # ── A: Sheet Metal Runs (per-foot pricing) ───────────────
    ("A","Sheet Metal Runs",'4" SMR', '4" Sheet Metal Run (10 ft)',  19.34, 1.04, 10),
    ("A","Sheet Metal Runs",'5" SMR', '5" Sheet Metal Run (13 ft)',  19.86, 1.40, 20),
    ("A","Sheet Metal Runs",'6" SMR', '6" Sheet Metal Run (13 ft)',  18.64, 1.41, 30),
    ("A","Sheet Metal Runs",'7" SMR', '7" Sheet Metal Run (13 ft)',  23.85, 1.85, 40),
    ("A","Sheet Metal Runs",'8" SMR', '8" Sheet Metal Run (5 ft)',   31.58, 2.08, 50),
    # ── B: Ductboard Runs R8 (per-foot pricing) ──────────────
    ("B","Ductboard Runs (R8)",'4" DBR', '4" Ductboard Run R8',  38.25, 1.57, 10),
    ("B","Ductboard Runs (R8)",'5" DBR', '5" Ductboard Run R8',  41.94, 1.72, 20),
    ("B","Ductboard Runs (R8)",'6" DBR', '6" Ductboard Run R8',  44.06, 1.83, 30),
    ("B","Ductboard Runs (R8)",'7" DBR', '7" Ductboard Run R8',  48.50, 2.02, 40),
    ("B","Ductboard Runs (R8)",'8" DBR', '8" Ductboard Run R8',  54.31, 2.25, 50),
    # ── C: Exhaust Runs (PVC dual pipe — Section P) ──────────
    ("C","Exhaust Runs","PVC2X21DP", '2" PVC Dual Pipe \u00d7 21\' thru Roof', 171.09, 0, 10),
    ("C","Exhaust Runs","PVC2X31DP", '2" PVC Dual Pipe \u00d7 31\' thru Roof', 183.13, 0, 20),
    ("C","Exhaust Runs","PVC2X41DP", '2" PVC Dual Pipe \u00d7 41\' thru Roof', 196.96, 0, 30),
    ("C","Exhaust Runs","PVC3X21DP", '3" PVC Dual Pipe \u00d7 21\' thru Roof', 226.70, 0, 40),
    ("C","Exhaust Runs","PVC3X31DP", '3" PVC Dual Pipe \u00d7 31\' thru Roof', 255.57, 0, 50),
    ("C","Exhaust Runs","PVC3X41DP", '3" PVC Dual Pipe \u00d7 41\' thru Roof', 289.44, 0, 60),
    # ── D: Class B Flues (per ft — Section P) ────────────────
    ("D","Class B Flues",'4" B-VENT', '4" Class B Flue (per ft)',   9.83, 0, 10),
    ("D","Class B Flues",'5" B-VENT', '5" Class B Flue (per ft)',  11.78, 0, 20),
    ("D","Class B Flues",'6" B-VENT', '6" Class B Flue (per ft)',  19.54, 0, 30),
    # ── E: B Vent Connectors (miscl chart 01-04) ─────────────
    ("E","B Vent Connectors","CONN-1", '4" B Vent Connector \u2014 Townhouse Furnace',     121.08, 0, 10),
    ("E","B Vent Connectors","CONN-2", '4" B Vent Connector \u2014 Townhouse HWH',         129.88, 0, 20),
    ("E","B Vent Connectors","CONN-3", '4" B Vent Connector \u2014 Single Family Furnace', 130.71, 0, 30),
    ("E","B Vent Connectors","CONN-4", '4" B Vent Connector \u2014 Single Family HWH',     183.45, 0, 40),
    # ── F: Combustion Air ─────────────────────────────────────
    ("F","Combustion Air","COMB-AIR", "Combustion Air Kit", 85.00, 0, 10),
    # ── G: PVC Flues (refrigerant lines per ft — Section P) ──
    ("G","PVC Flues","REF-LINES",    "Refrigerant Lines \u2014 copper (per ft)",         5.23, 0, 10),
    ("G","PVC Flues","REF-LINES-118","Refrigerant Lines \u2014 1-1/8\" copper (per ft)", 12.65, 0, 20),
    # ── H: Condensate Drain (Section P: CDA=$39.11, CDB=$11.68)
    ("H","Condensate Drain","CDA", "Condensate Drain \u2014 Attic (A)",    39.11, 0, 10),
    ("H","Condensate Drain","CDB", "Condensate Drain \u2014 Basement (B)", 11.68, 0, 20),
    # ── I: Condensate Pump (Section P item 11A: $139.03) ─────
    ("I","Condensate Pump","COND-PUMP", "Condensate Pump \u2014 CP1 (full assembly)", 139.03, 0, 10),
    # ── J: Control Wiring (Section P: $46.76) ────────────────
    ("J","Control Wiring","CTRL-WIRE", "Control Wiring 20/10", 46.76, 0, 10),
    # ── K: Copper Line Sets ───────────────────────────────────
    ("K","Copper Line Sets","LS-25", "Line Set 25 ft (3/8 x 3/4)",  130.83, 0, 10),
    ("K","Copper Line Sets","LS-35", "Line Set 35 ft (3/8 x 3/4)",  183.16, 0, 20),
    ("K","Copper Line Sets","LS-50", "Line Set 50 ft (3/8 x 3/4)",  261.65, 0, 30),
    # ── L: Equipment Mounting Kits (miscl chart 05-07) ───────
    ("L","Equipment Mounting Kits","EMKV-1", "EQ Mounting Kit Vertical 31\u00d731",  52.07, 0, 10),
    ("L","Equipment Mounting Kits","EMKV-2", "EQ Mounting Kit Vertical 31\u00d736",  53.59, 0, 20),
    ("L","Equipment Mounting Kits","EMKH",   "EQ Mounting Kit Horizontal 31\u00d760", 61.85, 0, 30),
    # ── M: Humidifiers (Section P items 10-11 + additional) ─────
    ("M","Humidifiers","HUM-BYPASS", "Aprilaire Model 600 Humidifier",      312.22, 0, 10),
    ("M","Humidifiers","HUM-POWER",  "Aprilaire Model 700 Humidifier",      424.22, 0, 20),
    ("M","Humidifiers","AA400M",     "Aprilaire Model 400M Humidifier",     260.82, 0, 30),
    ("M","Humidifiers","AA800",      "Aprilaire Model 800 Humidifier",      891.15, 0, 40),
    ("M","Humidifiers","HE200A1000", "Honeywell HE200A1000 Humidifier",     128.10, 0, 50),
    ("M","Humidifiers","HE300A1005", "Honeywell HE300A1005 Humidifier",     200.67, 0, 60),
    ("M","Humidifiers","HM612A1000", "Honeywell HM612A1000 Humidifier",    1187.44, 0, 70),
    # ── N: Air Cleaners (Section P items 12-17 + additional) ────
    ("N","Air Cleaners","AC-HE1400",   "Trion Electronic HE1400 16x25",        956.36, 0,  10),
    ("N","Air Cleaners","AC-HE2000",   "Trion Electronic HE2000 20x25",        979.68, 0,  20),
    ("N","Air Cleaners","AC-HF100-16", "HYW Media HF100F2002 16x25",           161.10, 0,  30),
    ("N","Air Cleaners","AC-HF100-20", "HYW Media HF100F2010 20x25",           161.10, 0,  40),
    ("N","Air Cleaners","AC-LX16",     "Lennox Media HCC16-28 w/HCXF16 MERV", 400.00, 0,  50),
    ("N","Air Cleaners","AC-LX20",     "Lennox Media HCC20-28 w/HCXF20 MERV", 550.00, 0,  60),
    ("N","Air Cleaners","AC-HF300-16", "HYW Electronic HF300E1019 16x25",    1027.55, 0,  70),
    ("N","Air Cleaners","AC-HF300-20", "HYW Electronic HF300E1035 20x25",    1122.96, 0,  80),
    ("N","Air Cleaners","AC-TAB16",    "Trion Air Bear Media 16x25",           104.74, 0,  90),
    ("N","Air Cleaners","AC-TAB20",    "Trion Air Bear Media 20x25",           104.74, 0, 100),
    ("N","Air Cleaners","AC-R5000",    "Aprilaire R5000 HEPA 15x25",           703.35, 0, 110),
    # ── O: Energy Recovery Ventilator (Section P item 18 + additional) ─
    ("O","Energy Recovery Ventilator","ERV",        "HYW ERV ER200",                           2351.45, 0, 10),
    ("O","Energy Recovery Ventilator","AA-8145",    "Aprilaire Ventilation System Model 8145",   339.75, 0, 20),
    ("O","Energy Recovery Ventilator","HRV200",     "Broan HRV200 Heat Recovery Ventilator",    1658.00, 0, 30),
    ("O","Energy Recovery Ventilator","ERV150",     "Broan ERV150 Energy Recovery Ventilator",  1252.00, 0, 40),
    ("O","Energy Recovery Ventilator","ERV-BROAN",  "Broan ERV Energy Recovery Ventilator",     1043.00, 0, 50),
    ("O","Energy Recovery Ventilator","ERV-CARRIER","Carrier ERV Energy Recovery Ventilator",   3284.00, 0, 60),
    # ── P: Duct Sealing (Section P item 19: $125.65) ─────────
    ("P","Duct Sealing","MASTIC-PKG", "Mastic Duct Sealing Package", 125.65, 0, 10),
    # ── Q: Laundry Chutes (Section P items 20-21) ────────────
    ("Q","Laundry Chutes","LC1S", "Laundry Chute 10x10 \u2014 One Story", 580.05, 0, 10),
    ("Q","Laundry Chutes","LC2S", "Laundry Chute 10x10 \u2014 Two Story", 759.22, 0, 20),
    # ── R: Fresh-Air ─────────────────────────────────────────
    ("R","Fresh-Air","CONCENTRIC", "Concentric Termination Kit",                39.60, 0, 10),
    ("R","Fresh-Air","CN2220",     "Condensate Neutralizer CN2-220",            62.10, 0, 20),
    ("R","Fresh-Air","AA-8142",    "Aprilaire 8142 Fresh Air Ventilator",      275.58, 0, 30),
    ("R","Fresh-Air","FIN-180B",   "Field Controls FIN-180B Fresh Air Damper", 215.95, 0, 40),
    ("R","Fresh-Air","FIN-180P",   "Field Controls FIN-180P Fresh Air Damper", 281.07, 0, 50),
    ("R","Fresh-Air","Y4010-8",    'Honeywell Y4010 Fresh Air Damper 8"',      165.00, 0, 60),
    ("R","Fresh-Air","Y4010-10",   'Honeywell Y4010 Fresh Air Damper 10"',     176.00, 0, 70),
    ("R","Fresh-Air","PS1503",     "Field Controls PS1503 Power Open Damper",   66.44, 0, 80),
    ("R","Fresh-Air","MAS-1",      "MAS-1 Make-Up Air System",                 102.02, 0, 90),
    # ── S: Transfer Grill (Section P: RETURN GRILL = $19.54) ─
    ("S","Transfer Grill","RET-GRILL", "Return / Transfer Grill", 19.54, 0, 10),
    # ── T: Zone Control Dampers (Section P items 22-25A) ─────
    ("T","Zone Control Dampers","APR-2Z",        "Aprilaire 6202 \u2014 2 Zone / 2 Dampers",         890.84, 0, 10),
    ("T","Zone Control Dampers","APR-3Z",        "Aprilaire 6203 \u2014 3 Zone / 3 Dampers",        1305.31, 0, 20),
    ("T","Zone Control Dampers","APR-3Z-HP",     "Aprilaire 6303 \u2014 2-3 Zone / 3 Dampers (HP)", 1365.22, 0, 30),
    ("T","Zone Control Dampers","APR-4Z",        "Aprilaire 6404 \u2014 4 Zone / 4 Dampers",        1743.12, 0, 40),
    ("T","Zone Control Dampers","CARRIER-INF-4Z","Carrier Infinity 4-Zone System",                  3713.13, 0, 50),
    ("T","Zone Control Dampers","EWC-2Z",        "EWC Model 3000-2 \u2014 2 Zone / 2 Dampers",      1503.49, 0, 60),
    ("T","Zone Control Dampers","EWC-3Z",        "EWC Model 3000-3 \u2014 3 Zone / 3 Dampers",      2077.46, 0, 70),
    ("T","Zone Control Dampers","EWC-4Z",        "EWC Model 5000-4 \u2014 4 Zone / 4 Dampers",      2664.17, 0, 80),
    # ── U: Misc. Accessories (Section P items 26-29A) ────────
    ("U","Misc. Accessories","TXV",      "TXV Valve",                              126.00, 0, 10),
    ("U","Misc. Accessories","LPK",      "LP Kit",                                 128.00, 0, 20),
    ("U","Misc. Accessories","SYW",      "Second Year Warranty",                   130.00, 0, 30),
    ("U","Misc. Accessories","AK-14",    'IPG Air Knight 14"',                     887.00, 0, 40),
    ("U","Misc. Accessories","AK-7",     'IPG Air Knight 7"',                      912.00, 0, 50),
    ("U","Misc. Accessories","R454B",    "R-454B Refrigerant Surcharge",            42.90, 0, 60),
    ("U","Misc. Accessories","FR-16X25", "Filter Rack 16x25 w/Filter",              16.62, 0, 70),
    ("U","Misc. Accessories","FR-20X25", "Filter Rack 20x25 w/Filter",              16.80, 0, 80),
    ("U","Misc. Accessories","SLABS",    "Polytex A/C Pads + Pump-Ups + Locking Caps",  42.52, 0,  90),
    ("U","Misc. Accessories","WALLBRKT", 'Wall Brackets (36")',                        134.81, 0, 100),
    ("U","Misc. Accessories","PERMIT",   "Building Permit",                            170.00, 0, 110),
    ("U","Misc. Accessories","HUV100",   "Honeywell UV100E1043 UV Lamp",               715.00, 0, 120),
    # ── V: Exhaust Fans (Section L — bath/exhaust fans) ───────
    ("V","Exhaust Fans","FAN-688",       "NuTone 688 Exhaust Fan",                      18.85, 0,  10),
    ("V","Exhaust Fans","FAN-AE80B",     "Broan AE80B Exhaust Fan",                     57.12, 0,  20),
    ("V","Exhaust Fans","FAN-AE80",      "Broan AE80 Exhaust Fan",                     164.80, 0,  30),
    ("V","Exhaust Fans","FAN-744LED",    "Broan 744LED Exhaust Fan w/Light",           148.00, 0,  40),
    ("V","Exhaust Fans","FAN-SLM70",     "Broan SLM70 Ultra-Silent Fan",                46.67, 0,  50),
    ("V","Exhaust Fans","FAN-SIG80",     "Broan SIG80-110D Exhaust Fan",               160.18, 0,  60),
    ("V","Exhaust Fans","FAN-BFQ80",     "Broan BFQ80 Exhaust Fan",                     50.61, 0,  70),
    ("V","Exhaust Fans","FAN-ZB110",     "Broan ZB110 Exhaust Fan",                    164.69, 0,  80),
    ("V","Exhaust Fans","FAN-ZB110L",    "Broan ZB110L Exhaust Fan w/Light",           240.98, 0,  90),
    ("V","Exhaust Fans","FAN-ZB110H",    "Broan ZB110H Exhaust Fan w/Heater",          164.69, 0, 100),
    ("V","Exhaust Fans","FAN-SSQTXE110", "Broan SSQTXE110 Ultra-Silent Fan",           164.69, 0, 110),
    ("V","Exhaust Fans","FAN-QTX110HL",  "Broan QTX110HL Fan w/Light & Heater",        254.05, 0, 120),
    ("V","Exhaust Fans","FAN-503",       "NuTone 503 Exhaust Fan",                     157.50, 0, 130),
    ("V","Exhaust Fans","FAN-PM390",     "Panasonic PM390 Exhaust Fan",                432.00, 0, 140),
    ("V","Exhaust Fans","FAN-FR100",     "Fantech FR100 Inline Fan",                   197.77, 0, 150),
    # ── W: HEPA Filters (Broan HEPA series) ──────────────────
    ("W","HEPA Filters","GSFH1K",    "Broan GSFH1K HEPA Filter System",           1210.00, 0, 10),
    ("W","HEPA Filters","GSVH1K",    "Broan GSVH1K HEPA Filter System",           1540.00, 0, 20),
    ("W","HEPA Filters","GSHH3K",    "Broan GSHH3K HEPA Filter System",           1980.00, 0, 30),
    ("W","HEPA Filters","GSEH3K",    "Broan GSEH3K HEPA Filter System",           2310.00, 0, 40),
    ("W","HEPA Filters","ACCGSFHP2", "Broan ACCGSFHP2 HEPA Replacement Filter",    275.00, 0, 50),
]
