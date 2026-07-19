import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { computeSystem, toAccessRow, type SystemInput } from "@/lib/bidmath";

// Shared assemble/compute/persist for plan create (POST /api/plans) and edit
// (PUT /api/plans/[id]). Prices are server-authoritative from the live Price
// Book/Equipment tables, but a bid may OVERRIDE any unit price in-bid; every
// override is recorded on the line (APP_OVERRIDES) as book vs used, so a
// deviated bid is always identifiable.

export const SystemSchema = z.object({
  houseType: z.string(),
  partNbr: z.string(),
  partCostOverride: z.number().min(0).nullable().optional(),
  sheetMetalCost: z.number().min(0).default(0),
  ductBoardCost: z.number().min(0).default(0),
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
  planNbr: z.string().min(2).max(24),
  builderName: z.string().min(1),
  projName: z.string().default(""),
  systems: z.array(SystemSchema).min(1).max(100),
});

export type PlanPayload = z.infer<typeof PlanSchema>;

type Override = { what: string; book: number | null; used: number };

export function assembleSystems(input: PlanPayload) {
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
    return { input: sysInput, overrides, totals: computeSystem(sysInput) };
  });
}

/** Writes plan + lines. planId null => insert; otherwise replace in place. */
export function persistPlan(input: PlanPayload, planId: number | null, status?: string): { id: number; total: number } {
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
            `INSERT INTO plans (plan_nbr, builder_name, proj_name, house_types, total, lines_count, edited_at, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(planNbr, input.builderName.trim(), input.projName.trim(), houseTypes, total, computed.length, now, status ?? "draft")
          .lastInsertRowid,
      );
    } else {
      db.prepare(
        `UPDATE plans SET builder_name=?, proj_name=?, house_types=?, total=?, lines_count=?, edited_at=? WHERE id=?`,
      ).run(input.builderName.trim(), input.projName.trim(), houseTypes, total, computed.length, now, planId);
      db.prepare("DELETE FROM plan_lines WHERE plan_id = ?").run(planId);
    }
    const insertLine = db.prepare(
      `INSERT INTO plan_lines (plan_id, house_nbr, system_nbr, work_nbr, house_type, part_nbr,
                               part_cost, labor_hours, labor_cost, factor, selling, final_total,
                               edit_date, data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    computed.forEach((c, i) => {
      const row = toAccessRow(c.input, c.totals);
      if (c.overrides.length) row.APP_OVERRIDES = JSON.stringify(c.overrides);
      insertLine.run(
        id, "01", String(i + 1).padStart(2, "0"), "01", c.input.houseType, c.input.partNbr,
        c.input.partCost, c.input.laborHours, c.input.laborCost, c.input.factor,
        c.totals.totSelling, c.totals.finalTotal, now, JSON.stringify(row),
      );
    });
  })();
  return { id, total };
}
