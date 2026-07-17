# Access Bid System — Schema Map (captured 2026-07-17)

Source snapshots live in `~/Projects/bid system/access-source/` (not in git):
`dbf/data.mdb` (162MB, live through 2026-07-15), `SERVER/server.mdb` (822MB,
live through 2026-07-16), `Documentation.mdb`, `dbf/PRICELST/`, fresh
`Equipment Downloads/` XLS pricing (unsuffixed files = current; Carrier.xls
carries "7/15/26 Increases"). Read everything with mdbtools; use
`-D "%Y-%m-%d" -T "%Y-%m-%d %H:%M:%S"` or datetimes export garbled.

## Topology

Every client/estimator .mdb (11 forks + 8 estimator copies) is a FRONT-END:
temp tables, proposal templates, linked tables only. Two backends hold all
data (originally Access 1.1, ~1993; tables-only since a 2013 corruption
incident — see dbf/Description of Databases.txt):

- `M:\CONTRACT\SRC\DBF\DATA.MDB` -> our `dbf/data.mdb` — bids, pricing charts,
  builders/projects/plans, contracts, billing. 74 tables.
- `P:\NEWSYS\SERVER\server.mdb` — properties (24,116), labor (1.46M rows),
  billing instructions, dispatch. Mostly operations-side; bid rebuild reads
  little of it.

## The bid model (data.mdb)

One `Bidsheet` row per (PLAN_NBR, HOUSE_NBR, SYSTEM_NBR, WORK_NBR) — a plan
can carry several systems/zones. 15,544 rows. 72 columns, three groups:

1. **Equipment**: `PART_NBR` = the bundle code (e.g. `CG9+602.5CP`),
   `PART_CST` its cost. `Eqcomp` (12,847 rows) maps bundle -> component model
   numbers (furnace + coil + outdoor unit). `Part` (319 rows) prices the
   individual components: PART_NBR, PART_COST, A_COST, DESC, CATEGORY, SEER,
   EQP_TYPE, AFUE.
2. **Ductwork + kits**: sheet metal pounds/cost (`SM_LBSTOT`/`SM_CST` +
   insulated variants), duct board (`DBTOT`/`DBRUNSTOT`), runs/flex totals,
   then QTY+COS column pairs per kit: BAEX (bath exhaust), BAFN (bath fan),
   KIEX (kitchen exhaust), DRVT (dryer vent), REG, GRILL, FLUE (+PVCFLUE),
   REFLN (refrigerant line), CONWIR, CONDP, SLAB, WALLBRACKET, SERV, permits.
3. **Money**: `TOT_MISCL`, `FACTOR` (margin multiplier) -> `FACTOR_TOT`,
   `TOTCOST`, `TOTSELLING`, `LABOR_HRS`/`LABOR_COS`, `SALTAX_PCT/TOT`,
   `SALCOM_PCT/TOT` (commission), `FINALTOT`, `SYS_TOT`, `HOUSE_TOT`,
   `ADJ_TOT`, `STATUS`, `EDIT_DATE`.

## Kit pricing = the `…cht` chart tables

One chart table per kit category; the new app's Kit Pricing seeds trace back
to these (verified: `Runscht` rows = the app's 5 Sheet Metal Run variants,
prices identical: 4" $19.34 + $1.04/ft…). All carry `DATE PRICE UPDATED`.

Runscht (SM runs: SIZE, BID_PRICE, ADD_FOOT, INSULATION, ADD_INSUL) ·
Flexcht / BidFlexRunsCht / FlexRunsWithConnectingHardwarecht · Smcht (sheet
metal per-lb) · DuctBoardCht / DuctBoardCht1 / RunsDuctBoardCht /
DBTrianglesAndReturnAirPansCht · RoundPipeCht · ExhaustRunCht · Fanscht ·
FADampersCht · WallCapAndRoofJackcht · RAandCAGrills · Misclcht (51 misc kit
items: DESC, AMOUNT, PART_NBR) · Fixedcht · StatsCht.

## Directory / workflow tables

- `Builder` (1,428) · `Project` (8,292) · `PLANS` (299 active roots; PLAN_NBR
  + ROOT + COUNT + DEL flag) · `Estimator` / `Salesman` / `Foreman`.
- `Contract` (9,313) + Contract Includes / Not Included / Options — generated
  contract text-and-terms per bid.
- `Billing` (234) — handoff to billing.
- `Bid *` tables (Bid Runs, Bid Flex Runs, Bid Duct Board…) — per-bid working
  detail lines behind the Bidsheet totals.
- `Master Options` / `Builder Master Options` / `Project Master Options` /
  `Bid Options & Standards` — the option/standards hierarchy (master ->
  builder -> project overrides).

## Equipment pricing feed (Equipment Downloads/*.xls)

Per-manufacturer BIFF .xls, sheets `COMPONT PRICING` + `SYSTEM PRICING`.
Old ritual: Excel -> .prn ASCII -> "Update Bid System with New Prices.mdb"
pushes into Part/charts. Replacement: direct XLS upload in the new app
(parse, preview, apply, audit-log) + à-la-carte inline edits.

## Import strategy (cut-sheet playbook)

- mdbtools extraction -> ledger-keyed idempotent import (key: PLAN_NBR +
  HOUSE_NBR + SYSTEM_NBR + WORK_NBR for bidsheets).
- Newest-wins: `data.mdb` is the single live truth (dated snapshots exist for
  recovery only — do not merge forks).
- Acceptance test: reproduce one recent real bid's FINALTOT to the penny
  before shipping anything.
