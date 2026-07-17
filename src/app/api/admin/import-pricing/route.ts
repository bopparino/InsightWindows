import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pricing bundle sink (scripts/extract-pricing.py -> scripts/push-pricing.mts).
// Kit items upsert by (category, code), parts by part_nbr, eqcomp is replaced
// wholesale (it is a pure mapping with no local edits to preserve).

const BundleSchema = z.object({
  kit_items: z
    .array(
      z.object({
        category: z.string().min(1),
        code: z.string().min(1),
        label: z.string(),
        price: z.number().nullable(),
        per_foot: z.number().nullable(),
        is_chart: z.number(),
        extra: z.record(z.string(), z.string()),
        price_updated: z.string().nullable(),
        sort: z.number(),
      }),
    )
    .max(5000)
    .optional(),
  parts: z
    .array(
      z.object({
        part_nbr: z.string().min(1),
        description: z.string(),
        cost: z.number().nullable(),
        a_cost: z.number().nullable(),
        category: z.string(),
        seer: z.string(),
        eqp_type: z.string(),
        afue: z.string(),
      }),
    )
    .max(20000)
    .optional(),
  eqcomp: z
    .array(z.object({ part_nbr: z.string().min(1), comp_nbr: z.string().min(1) }))
    .max(50000)
    .optional(),
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

  const upsertKit = db.prepare(
    `INSERT INTO kit_items (category, code, label, price, per_foot, is_chart, extra, price_updated, sort)
     VALUES (@category, @code, @label, @price, @per_foot, @is_chart, @extra, @price_updated, @sort)
     ON CONFLICT (category, code) DO UPDATE SET
       label=excluded.label, price=excluded.price, per_foot=excluded.per_foot,
       is_chart=excluded.is_chart, extra=excluded.extra,
       price_updated=excluded.price_updated, sort=excluded.sort`,
  );
  const upsertPart = db.prepare(
    `INSERT INTO parts (part_nbr, description, cost, a_cost, category, seer, eqp_type, afue)
     VALUES (@part_nbr, @description, @cost, @a_cost, @category, @seer, @eqp_type, @afue)
     ON CONFLICT (part_nbr) DO UPDATE SET
       description=excluded.description, cost=excluded.cost, a_cost=excluded.a_cost,
       category=excluded.category, seer=excluded.seer, eqp_type=excluded.eqp_type,
       afue=excluded.afue`,
  );

  let kits = 0;
  let parts = 0;
  let links = 0;

  const run = db.transaction(() => {
    for (const k of bundle.kit_items ?? []) {
      upsertKit.run({ ...k, extra: JSON.stringify(k.extra) });
      kits++;
    }
    for (const p of bundle.parts ?? []) {
      upsertPart.run(p);
      parts++;
    }
    if (bundle.eqcomp?.length) {
      db.prepare("DELETE FROM eqcomp").run();
      const ins = db.prepare("INSERT OR IGNORE INTO eqcomp (part_nbr, comp_nbr) VALUES (?, ?)");
      for (const e of bundle.eqcomp) {
        ins.run(e.part_nbr, e.comp_nbr);
        links++;
      }
    }
  });
  run();

  return NextResponse.json({ kits, parts, links });
}
