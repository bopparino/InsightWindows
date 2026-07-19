import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { PlanSchema, persistPlan } from "@/lib/planWrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await requireApiUser();
  if (me instanceof Response) return me;
  const { id } = await ctx.params;
  const planId = Number(id);

  const existing = db.prepare("SELECT plan_nbr FROM plans WHERE id = ?").get(planId) as
    | { plan_nbr: string }
    | undefined;
  if (!existing) return new NextResponse("plan not found", { status: 404 });

  let input: z.infer<typeof PlanSchema>;
  try {
    input = PlanSchema.parse(await req.json());
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues[0]?.message : "unreadable JSON";
    return new NextResponse(`bad plan: ${msg}`, { status: 400 });
  }

  // Plan numbers are identity; edits keep the existing one.
  input.planNbr = existing.plan_nbr;
  const { total } = persistPlan(input, planId);
  return NextResponse.json({ id: planId, planNbr: existing.plan_nbr, total });
}
