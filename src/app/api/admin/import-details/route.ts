import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Composition sink (scripts/extract-details.py -> push-details.mts). For each
// plan present in the chunk, its stored details are replaced wholesale -
// chunks must therefore carry whole plans, which the push script guarantees.

const DetailSchema = z.object({
  plan_nbr: z.string().min(1),
  house_nbr: z.string(),
  system_nbr: z.string(),
  category: z.string().min(1),
  code: z.string(),
  label: z.string(),
  qty: z.number(),
  unit_cost: z.number(),
  feet: z.number(),
  height: z.number(),
  width: z.number(),
  insulated: z.number(),
});

const BundleSchema = z.object({ details: z.array(DetailSchema).min(1).max(20000) });

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

  const planIdFor = db.prepare("SELECT id FROM plans WHERE plan_nbr = ?");
  const wipe = db.prepare("DELETE FROM plan_line_details WHERE plan_id = ?");
  const insert = db.prepare(
    `INSERT INTO plan_line_details (plan_id, house_nbr, system_nbr, category, code, label,
                                    qty, unit_cost, feet, height, width, insulated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  let inserted = 0;
  let unmatched = 0;
  const run = db.transaction(() => {
    const wiped = new Set<number>();
    for (const d of bundle.details) {
      const plan = planIdFor.get(d.plan_nbr) as { id: number } | undefined;
      if (!plan) {
        unmatched++;
        continue;
      }
      if (!wiped.has(plan.id)) {
        wipe.run(plan.id);
        wiped.add(plan.id);
      }
      insert.run(
        plan.id, d.house_nbr, d.system_nbr, d.category, d.code, d.label,
        d.qty, d.unit_cost, d.feet, d.height, d.width, d.insulated,
      );
      inserted++;
    }
  });
  run();

  return NextResponse.json({ inserted, unmatched });
}
