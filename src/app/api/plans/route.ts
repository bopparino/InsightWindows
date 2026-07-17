import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { computeSystem, toAccessRow, type SystemInput } from "@/lib/bidmath";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Create a plan from the New Plan form. Totals are recomputed server-side
// with the verified bid math - the client's numbers are display only.

const SystemSchema = z.object({
  houseType: z.string(),
  partNbr: z.string(),
  sheetMetalCost: z.number().min(0).default(0),
  ductBoardCost: z.number().min(0).default(0),
  otherCost: z.number().min(0).default(0),
  kitLines: z
    .array(z.object({ id: z.number().int(), qty: z.number().min(0) }))
    .default([]),
  laborHours: z.number().min(0).default(0),
  laborCost: z.number().min(0).default(0),
  factor: z.number().gt(0).max(1),
  taxPct: z.number().min(0).max(0.2).default(0.06),
  permitCost: z.number().min(0).default(0),
  serviceCost: z.number().min(0).default(0),
  commission: z.number().min(0).default(0),
});

const PlanSchema = z.object({
  planNbr: z.string().min(2).max(24),
  builderName: z.string().min(1),
  projName: z.string().default(""),
  systems: z.array(SystemSchema).min(1).max(12),
});

export async function POST(req: Request) {
  const me = await requireApiUser();
  if (me instanceof Response) return me;

  let input: z.infer<typeof PlanSchema>;
  try {
    input = PlanSchema.parse(await req.json());
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues[0]?.message : "unreadable JSON";
    return new NextResponse(`bad plan: ${msg}`, { status: 400 });
  }

  const planNbr = input.planNbr.trim().toUpperCase();
  if (db.prepare("SELECT 1 FROM plans WHERE plan_nbr = ?").get(planNbr)) {
    return new NextResponse(`plan ${planNbr} already exists`, { status: 409 });
  }

  // Server-authoritative prices: equipment cost from parts, kit unit prices
  // from kit_items (latest Price Book values), never from the client.
  const partCost = db.prepare("SELECT cost FROM parts WHERE part_nbr = ?");
  const kitPrice = db.prepare("SELECT code, label, price FROM kit_items WHERE id = ? AND is_chart = 0");

  const systems: { input: SystemInput; houseType: string }[] = input.systems.map((s) => {
    const part = s.partNbr ? (partCost.get(s.partNbr) as { cost: number | null } | undefined) : undefined;
    const kitLines = s.kitLines
      .filter((k) => k.qty > 0)
      .flatMap((k) => {
        const item = kitPrice.get(k.id) as { code: string; label: string; price: number | null } | undefined;
        if (!item) return [];
        return [{ code: item.code, label: item.label, qty: k.qty, unitPrice: item.price ?? 0 }];
      });
    return {
      houseType: s.houseType.trim(),
      input: {
        houseType: s.houseType.trim(),
        partNbr: s.partNbr.trim(),
        partCost: part?.cost ?? 0,
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
      },
    };
  });

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const computed = systems.map((s) => ({ ...s, totals: computeSystem(s.input) }));
  const total = Math.round(computed.reduce((sum, c) => sum + c.totals.finalTotal, 0) * 100) / 100;
  const houseTypes = [...new Set(computed.map((c) => c.houseType).filter(Boolean))].join(" · ");

  const insertPlan = db.prepare(
    `INSERT INTO plans (plan_nbr, builder_name, proj_name, house_types, total, lines_count, edited_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertLine = db.prepare(
    `INSERT INTO plan_lines (plan_id, house_nbr, system_nbr, work_nbr, house_type, part_nbr,
                             part_cost, labor_hours, labor_cost, factor, selling, final_total,
                             edit_date, data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  let planId = 0;
  db.transaction(() => {
    planId = Number(
      insertPlan.run(planNbr, input.builderName.trim(), input.projName.trim(), houseTypes, total, computed.length, now)
        .lastInsertRowid,
    );
    computed.forEach((c, i) => {
      const sys = String(i + 1).padStart(2, "0");
      insertLine.run(
        planId, "01", sys, "01", c.houseType, c.input.partNbr,
        c.input.partCost, c.input.laborHours, c.input.laborCost, c.input.factor,
        c.totals.totSelling, c.totals.finalTotal, now,
        JSON.stringify(toAccessRow(c.input, c.totals)),
      );
    });
  })();

  return NextResponse.json({ id: planId, planNbr, total });
}
