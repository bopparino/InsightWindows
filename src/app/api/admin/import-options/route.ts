import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BundleSchema = z.object({
  options: z
    .array(
      z.object({
        level: z.enum(["master", "builder", "project"]),
        ref_code: z.string(),
        option_number: z.string().min(1),
        description: z.string(),
        part_nbr: z.string(),
        std_price: z.number().nullable(),
        opt_price: z.number().nullable(),
        pwk_price: z.number().nullable(),
      }),
    )
    .min(1)
    .max(30000),
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

  const upsert = db.prepare(
    `INSERT INTO options (level, ref_code, option_number, description, part_nbr, std_price, opt_price, pwk_price)
     VALUES (@level, @ref_code, @option_number, @description, @part_nbr, @std_price, @opt_price, @pwk_price)
     ON CONFLICT (level, ref_code, option_number) DO UPDATE SET
       description=excluded.description, part_nbr=excluded.part_nbr,
       std_price=excluded.std_price, opt_price=excluded.opt_price, pwk_price=excluded.pwk_price`,
  );
  let n = 0;
  db.transaction(() => {
    for (const o of bundle.options) {
      upsert.run(o);
      n++;
    }
  })();
  return NextResponse.json({ upserted: n });
}
