import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { computeSystem, toAccessRow, type GeoCharts, type SystemInput } from "@/lib/bidmath";

// Shared assemble/compute/persist for plan create (POST /api/plans) and edit
// (PUT /api/plans/[id]). Prices are server-authoritative from the live Price
// Book/Equipment tables, but a bid may OVERRIDE any unit price in-bid; every
// override is recorded on the line (APP_OVERRIDES) as book vs used, so a
// deviated bid is always identifiable.

export const SystemSchema = z.object({
  houseNbr: z.string().max(4).default("01"),
  houseType: z.string(),
  partNbr: z.string(),
  partCostOverride: z.number().min(0).nullable().optional(),
  smRuns: z
    .array(z.object({ feet: z.number().min(0), height: z.number().min(0), width: z.number().min(0), insulated: z.boolean().default(false) }))
    .default([]),
  dbRuns: z
    .array(z.object({ feet: z.number().min(0), height: z.number().min(0), width: z.number().min(0), insulated: z.boolean().default(false) }))
    .default([]),
  // adjustments may be negative: legacy imports park (stored - geometry) here
  sheetMetalCost: z.number().default(0),
  ductBoardCost: z.number().default(0),
  otherCost: z.number().min(0).default(0),
  kitLines: z
    .array(
      z.object({
        id: z.number().int().optional(), // absent => custom ad-hoc item
        label: z.string().default(""),
        qty: z.number().min(0),
        unitPrice: z.number().min(0).nullable().optional(), // override / custom price
      }),
    )
    .default([]),
  laborHours: z.number().min(0).default(0),
  laborCost: z.number().min(0).default(0),
  factor: z.number().gt(0).max(1),
  taxPct: z.number().min(0).max(0.2).default(0.06),
  permitCost: z.number().min(0).default(0),
  serviceCost: z.number().min(0).default(0),
  commission: z.number().min(0).default(0),
});

export const PlanSchema = z.object({
  dueDate: z.string().max(10).default(""),
  planNbr: z.string().min(2).max(24),
  builderName: z.string().min(1),
  projName: z.string().default(""),
  systems: z.array(SystemSchema).min(1).max(100),
});

export type PlanPayload = z.infer<typeof PlanSchema>;

type Override = { what: string; book: number | null; used: number };

export function loadGeoCharts(): GeoCharts {
  const charts: GeoCharts = { smLbf: {}, smSqf: {}, dbSqf: {}, smRate: 0, insRate: 0, dbRate: 0 };
  for (const row of db
    .prepare("SELECT category, code, extra FROM kit_items WHERE is_chart = 1")
    .all() as { category: string; code: string; extra: string }[]) {
    const e = JSON.parse(row.extra) as Record<string, string>;
    if (row.category.startsWith("Sheet Metal Chart")) {
      charts.smLbf[row.code] = Number(e.LBF ?? 0);
      charts.smSqf[row.code] = Number(e.SQF ?? 0);
    } else if (row.category.startsWith("Duct Board Chart")) {
      charts.dbSqf[row.code] = Number(e.SQF ?? 0);
    }
  }
  const rate = db.prepare("SELECT price FROM kit_items WHERE category = 'Fixed Prices' AND code = ?");
  charts.smRate = (rate.get("SHEETMETAL") as { price: number } | undefined)?.price ?? 1.55;
  charts.insRate = (rate.get("INSULATION") as { price: number } | undefined)?.price ?? 0.71;
  charts.dbRate = (rate.get("DUCTBOARD") as { price: number } | undefined)?.price ?? 1.57;
  return charts;
}

export function assembleSystems(input: PlanPayload) {
  const charts = loadGeoCharts();
  const partRow = db.prepare("SELECT cost FROM parts WHERE part_nbr = ?");
  const kitRow = db.prepare("SELECT code, label, price FROM kit_items WHERE id = ? AND is_chart = 0");

  return input.systems.map((s) => {
    const overrides: Override[] = [];
    const book = s.partNbr ? ((partRow.get(s.partNbr) as { cost: number | null } | undefined)?.cost ?? null) : null;
    const partCost = s.partCostOverride ?? book ?? 0;
    if (s.partCostOverride != null && s.partCostOverride !== book) {
      overrides.push({ what: `Equipment ${s.partNbr}`, book, used: s.partCostOverride });
    }

    const kitLines = s.kitLines
      .filter((k) => k.qty > 0)
      .flatMap((k) => {
        if (k.id != null) {
          const item = kitRow.get(k.id) as { code: string; label: string; price: number | null } | undefined;
          if (!item) return [];
          const used = k.unitPrice ?? item.price ?? 0;
          if (k.unitPrice != null && k.unitPrice !== item.price) {
            overrides.push({ what: `${item.label || item.code}`, book: item.price, used: k.unitPrice });
          }
          return [{ code: item.code, label: item.label, qty: k.qty, unitPrice: used }];
        }
        // Custom ad-hoc item: label + price live on the bid only.
        if (!k.label.trim() || k.unitPrice == null) return [];
        overrides.push({ what: `Custom: ${k.label.trim()}`, book: null, used: k.unitPrice });
        return [{ code: "CUSTOM", label: k.label.trim(), qty: k.qty, unitPrice: k.unitPrice }];
      });

    const sysInput: SystemInput = {
      houseType: s.houseType.trim(),
      partNbr: s.partNbr.trim(),
      partCost,
      smRuns: s.smRuns,
      dbRuns: s.dbRuns,
      sheetMetalCost: s.sheetMetalCost,
      ductBoardCost: s.ductBoardCost,
      otherCost: s.otherCost,
      kitLines,
      laborHours: s.laborHours,
      laborCost: s.laborCost,
      factor: s.factor,
      taxPct: s.taxPct,
      permitCost: s.permitCost,
      serviceCost: s.serviceCost,
      commission: s.commission,
    };
    return { input: sysInput, overrides, totals: computeSystem(sysInput, charts), houseNbr: s.houseNbr };
  });
}

/** Writes plan + lines. planId null => insert; otherwise replace in place. */
export function persistPlan(input: PlanPayload, planId: number | null, status?: string, createdBy?: number): { id: number; total: number } {
  const computed = assembleSystems(input);
  const total = Math.round(computed.reduce((sum, c) => sum + c.totals.finalTotal, 0) * 100) / 100;
  const houseTypes = [...new Set(computed.map((c) => c.input.houseType).filter(Boolean))].join(" · ");
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const planNbr = input.planNbr.trim().toUpperCase();

  let id = planId ?? 0;
  db.transaction(() => {
    if (planId == null) {
      id = Number(
        db
          .prepare(
            `INSERT INTO plans (plan_nbr, builder_name, proj_name, house_types, total, lines_count, edited_at, status, created_by, due_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(planNbr, input.builderName.trim(), input.projName.trim(), houseTypes, total, computed.length, now, status ?? "draft", createdBy ?? null, input.dueDate || null)
          .lastInsertRowid,
      );
    } else {
      db.prepare(
        `UPDATE plans SET builder_name=?, proj_name=?, house_types=?, total=?, lines_count=?, edited_at=?, due_date=? WHERE id=?`,
      ).run(input.builderName.trim(), input.projName.trim(), houseTypes, total, computed.length, now, input.dueDate || null, planId);
      db.prepare("DELETE FROM plan_lines WHERE plan_id = ?").run(planId);
    }
    const insertLine = db.prepare(
      `INSERT INTO plan_lines (plan_id, house_nbr, system_nbr, work_nbr, house_type, part_nbr,
                               part_cost, labor_hours, labor_cost, factor, selling, final_total,
                               edit_date, data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const sysCounter = new Map<string, number>();
    computed.forEach((c) => {
      const row = toAccessRow(c.input, c.totals);
      if (c.overrides.length) row.APP_OVERRIDES = JSON.stringify(c.overrides);
      const house = (c.houseNbr || "01").padStart(2, "0");
      const nth = (sysCounter.get(house) ?? 0) + 1;
      sysCounter.set(house, nth);
      insertLine.run(
        id, house, String(nth).padStart(2, "0"), "01", c.input.houseType, c.input.partNbr,
        c.input.partCost, c.input.laborHours, c.input.laborCost, c.input.factor,
        c.totals.totSelling, c.totals.finalTotal, now, JSON.stringify(row),
      );
    });
  })();
  return { id, total };
}
