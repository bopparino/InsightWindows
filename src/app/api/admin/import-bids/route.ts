import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin sink for bid bundles from scripts/extract-bids.py, pushed by
// scripts/push-bids.mts. Upserts by plan_nbr (Access wins: incoming data
// replaces the stored plan and its lines), so chunks are idempotent and
// re-imports refresh in place — the cut-sheet playbook.

const LineSchema = z.object({
  house_nbr: z.string(),
  system_nbr: z.string(),
  work_nbr: z.string(),
  house_type: z.string(),
  part_nbr: z.string(),
  part_cost: z.number(),
  labor_hours: z.number(),
  labor_cost: z.number(),
  factor: z.number(),
  selling: z.number(),
  final_total: z.number(),
  edit_date: z.string().nullable(),
  data: z.record(z.string(), z.string()),
});

const BundleSchema = z.object({
  plans: z
    .array(
      z.object({
        plan_nbr: z.string().min(1),
        builder_code: z.string(),
        builder_name: z.string(),
        proj_code: z.string(),
        proj_name: z.string(),
        house_types: z.string(),
        total: z.number(),
        proposed_at: z.string().nullable(),
        contracted_at: z.string().nullable(),
        edited_at: z.string().nullable(),
        lines: z.array(LineSchema).min(1),
      }),
    )
    .min(1)
    .max(200),
});

export async function POST(req: Request) {
  const me = await requireApiAdmin();
  if (me instanceof Response) return me;

  let bundle: z.infer<typeof BundleSchema>;
  try {
    bundle = BundleSchema.parse(await req.json());
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues[0]?.message : "unreadable JSON";
    return new NextResponse(`bad bundle: ${msg}`, { status: 400 });
  }

  const findPlan = db.prepare("SELECT id FROM plans WHERE plan_nbr = ?");
  const insertPlan = db.prepare(
    `INSERT INTO plans (plan_nbr, builder_code, builder_name, proj_code, proj_name,
                        house_types, total, lines_count, proposed_at, contracted_at, edited_at)
     VALUES (@plan_nbr, @builder_code, @builder_name, @proj_code, @proj_name,
             @house_types, @total, @lines_count, @proposed_at, @contracted_at, @edited_at)`,
  );
  const updatePlan = db.prepare(
    `UPDATE plans SET builder_code=@builder_code, builder_name=@builder_name,
                      proj_code=@proj_code, proj_name=@proj_name, house_types=@house_types,
                      total=@total, lines_count=@lines_count, proposed_at=@proposed_at,
                      contracted_at=@contracted_at, edited_at=@edited_at
     WHERE id=@id`,
  );
  const deleteLines = db.prepare("DELETE FROM plan_lines WHERE plan_id = ?");
  const insertLine = db.prepare(
    `INSERT INTO plan_lines (plan_id, house_nbr, system_nbr, work_nbr, house_type, part_nbr,
                             part_cost, labor_hours, labor_cost, factor, selling, final_total,
                             edit_date, data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  let imported = 0;
  let updated = 0;

  const run = db.transaction(() => {
    for (const p of bundle.plans) {
      const fields = {
        plan_nbr: p.plan_nbr,
        builder_code: p.builder_code,
        builder_name: p.builder_name,
        proj_code: p.proj_code,
        proj_name: p.proj_name,
        house_types: p.house_types,
        total: p.total,
        lines_count: p.lines.length,
        proposed_at: p.proposed_at,
        contracted_at: p.contracted_at,
        edited_at: p.edited_at,
      };
      const existing = findPlan.get(p.plan_nbr) as { id: number } | undefined;
      let planId: number;
      if (existing) {
        updatePlan.run({ ...fields, id: existing.id });
        deleteLines.run(existing.id);
        planId = existing.id;
        updated++;
      } else {
        planId = Number(insertPlan.run(fields).lastInsertRowid);
        imported++;
      }
      for (const l of p.lines) {
        insertLine.run(
          planId, l.house_nbr, l.system_nbr, l.work_nbr, l.house_type, l.part_nbr,
          l.part_cost, l.labor_hours, l.labor_cost, l.factor, l.selling, l.final_total,
          l.edit_date, JSON.stringify(l.data),
        );
      }
    }
  });
  run();

  return NextResponse.json({ imported, updated });
}
