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

export type SystemInput = {
  houseType: string;
  partNbr: string;
  partCost: number;
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
};

const r2 = (n: number) => Math.round(n * 100) / 100;
// Ceiling with a float-noise guard so an exact integer quotient stays put.
// (|| 0 normalizes the -0 that ceil produces on empty bids - it rendered as
// "-$0.00" in the totals panel.)
const ceil$ = (n: number) => Math.ceil(n - 1e-9) || 0;

export function computeSystem(s: SystemInput): SystemTotals {
  const kitTotal = r2(s.kitLines.reduce((sum, k) => sum + k.qty * k.unitPrice, 0));
  const totCost = r2(s.partCost + s.sheetMetalCost + s.ductBoardCost + s.otherCost + kitTotal);
  const factor = s.factor > 0 && s.factor <= 1 ? s.factor : 1;
  const totSelling = ceil$(totCost / factor);
  const factorTot = r2(totSelling - totCost);
  const salesTax = ceil$(totCost * s.taxPct);
  const finalTotal = r2(
    totSelling + s.laborCost + salesTax + s.commission + s.permitCost + s.serviceCost,
  );
  return { kitTotal, totCost, totSelling, factorTot, salesTax, finalTotal };
}

/** Store app-created lines in Access-shaped keys so the plan detail page and
 *  any future export read imported and app-born lines identically. */
export function toAccessRow(s: SystemInput, t: SystemTotals): Record<string, string> {
  const row: Record<string, string> = {
    HOUSE_TYPE: s.houseType,
    PART_NBR: s.partNbr,
    PART_CST: String(s.partCost),
    SM_CST: String(s.sheetMetalCost),
    DBTOT: String(s.ductBoardCost),
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
