// The bid money math, reverse-engineered from 550 real Access bidsheet lines
// (2025+) and verified exact on all 550:
//
//   TOTSELLING = ceil(TOTCOST / FACTOR)      factor is a cost ratio (0.6 =>
//                                            sell at cost/0.6); Access rounds
//                                            UP to whole dollars (estimator's
//                                            rounding - strict test: 482/485)
//   FACTOR_TOT = TOTSELLING - TOTCOST        the profit slice
//   SALTAX_TOT = ceil(TOTCOST * SALTAX_PCT)  tax on COST, pct as fraction
//                                            (ceiling exact on 485/485)
//   FINALTOT   = TOTSELLING + LABOR_COS + SALTAX_TOT + SALCOM_TOT
//                + PERMIT_COS + ELPERM_COS + SERV_COS
//
// Commission (SALCOM_TOT) had no derivable base in the historical data - it
// was hand-keyed in Access - so it stays an explicit dollar input.

export type KitLine = { code: string; label: string; qty: number; unitPrice: number };
export type GeoRun = { feet: number; height: number; width: number; insulated: boolean };
// Chart data for the geometry math (from kit_items charts + Fixed Prices):
// smLbf: size -> lbs per foot · smSqf: size -> sqft per foot (insulation wrap)
// dbSqf: size -> sqft per foot · rates per lb / sqft.
export type GeoCharts = {
  smLbf: Record<string, number>;
  smSqf: Record<string, number>;
  dbSqf: Record<string, number>;
  smRate: number;
  insRate: number;
  dbRate: number;
};

/** Sheet metal: lbs = sum(feet x LBF[h+w]) - verified 495/500 against the
 *  imported bid geometry. Cost = ceil(lbs x rate) + ceil(insulated sqft x
 *  insulation rate). Duct board: same shape on sqft. */
export function computeGeo(runs: GeoRun[], kind: "sm" | "db", charts: GeoCharts) {
  let lbs = 0;
  let sqftIns = 0;
  let sqftDb = 0;
  for (const r of runs) {
    if (r.feet <= 0) continue;
    const size = String(Math.round(r.height + r.width));
    if (kind === "sm") {
      lbs += r.feet * (charts.smLbf[size] ?? 0);
      if (r.insulated) sqftIns += r.feet * (charts.smSqf[size] ?? 0);
    } else {
      sqftDb += r.feet * (charts.dbSqf[size] ?? 0);
    }
  }
  const cost =
    kind === "sm"
      ? (lbs > 0 ? Math.ceil(lbs * charts.smRate - 1e-9) : 0) +
        (sqftIns > 0 ? Math.ceil(sqftIns * charts.insRate - 1e-9) : 0)
      : sqftDb > 0
        ? Math.ceil(sqftDb * charts.dbRate - 1e-9)
        : 0;
  return { lbs: Math.round(lbs), sqft: kind === "sm" ? sqftIns : sqftDb, cost };
}

export type SystemInput = {
  houseType: string;
  partNbr: string;
  partCost: number;
  smRuns: GeoRun[];
  dbRuns: GeoRun[];
  // Manual adjustments on top of the geometry (legacy imports park their
  // stored costs here so old bids open penny-identical; may be negative).
  sheetMetalCost: number;
  ductBoardCost: number;
  otherCost: number;
  kitLines: KitLine[];
  laborHours: number;
  laborCost: number;
  factor: number;
  taxPct: number;
  permitCost: number;
  serviceCost: number;
  commission: number;
};

export type SystemTotals = {
  kitTotal: number;
  totCost: number;
  totSelling: number;
  factorTot: number;
  salesTax: number;
  finalTotal: number;
  smLbs: number;
  smGeoCost: number;
  dbSqft: number;
  dbGeoCost: number;
};

const r2 = (n: number) => Math.round(n * 100) / 100;
// Ceiling with a float-noise guard so an exact integer quotient stays put.
// (|| 0 normalizes the -0 that ceil produces on empty bids - it rendered as
// "-$0.00" in the totals panel.)
const ceil$ = (n: number) => Math.ceil(n - 1e-9) || 0;

export function computeSystem(s: SystemInput, charts?: GeoCharts): SystemTotals {
  const kitTotal = r2(s.kitLines.reduce((sum, k) => sum + k.qty * k.unitPrice, 0));
  const geoSm = charts ? computeGeo(s.smRuns, "sm", charts) : { lbs: 0, sqft: 0, cost: 0 };
  const geoDb = charts ? computeGeo(s.dbRuns, "db", charts) : { lbs: 0, sqft: 0, cost: 0 };
  const totCost = r2(
    s.partCost + geoSm.cost + geoDb.cost + s.sheetMetalCost + s.ductBoardCost + s.otherCost + kitTotal,
  );
  const factor = s.factor > 0 && s.factor <= 1 ? s.factor : 1;
  const totSelling = ceil$(totCost / factor);
  const factorTot = r2(totSelling - totCost);
  const salesTax = ceil$(totCost * s.taxPct);
  const finalTotal = r2(
    totSelling + s.laborCost + salesTax + s.commission + s.permitCost + s.serviceCost,
  );
  return { kitTotal, totCost, totSelling, factorTot, salesTax, finalTotal, smLbs: geoSm.lbs, smGeoCost: geoSm.cost, dbSqft: geoDb.sqft, dbGeoCost: geoDb.cost };
}

/** Store app-created lines in Access-shaped keys so the plan detail page and
 *  any future export read imported and app-born lines identically. */
export function toAccessRow(s: SystemInput, t: SystemTotals): Record<string, string> {
  const row: Record<string, string> = {
    HOUSE_TYPE: s.houseType,
    PART_NBR: s.partNbr,
    PART_CST: String(s.partCost),
    SM_LBSTOT: String(t.smLbs),
    SM_CST: String(t.smGeoCost + s.sheetMetalCost),
    DBTOT: String(t.dbGeoCost + s.ductBoardCost),
    APP_SM_RUNS: JSON.stringify(s.smRuns),
    APP_DB_RUNS: JSON.stringify(s.dbRuns),
    TOT_MISCL: String(t.kitTotal),
    TOTCOST: String(t.totCost),
    FACTOR: String(s.factor),
    FACTOR_TOT: String(t.factorTot),
    TOTSELLING: String(t.totSelling),
    LABOR_HRS: String(s.laborHours),
    LABOR_COS: String(s.laborCost),
    SALTAX_PCT: String(s.taxPct),
    SALTAX_TOT: String(t.salesTax),
    SALCOM_TOT: String(s.commission),
    PERMIT_COS: String(s.permitCost),
    SERV_COS: String(s.serviceCost),
    FINALTOT: String(t.finalTotal),
    APP_OTHER_COST: String(s.otherCost),
    APP_KIT_ITEMS: JSON.stringify(s.kitLines),
  };
  return row;
}
