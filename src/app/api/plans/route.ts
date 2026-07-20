import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { PlanSchema, persistPlan } from "@/lib/planWrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const { id, total } = persistPlan(input, null, undefined, me.id);
  return NextResponse.json({ id, planNbr, total });
}
