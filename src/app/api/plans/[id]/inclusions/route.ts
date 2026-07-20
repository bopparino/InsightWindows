import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await requireApiUser();
  if (me instanceof Response) return me;
  const { id } = await ctx.params;
  const planId = Number(id);
  const plan = db.prepare("SELECT created_by FROM plans WHERE id = ?").get(planId) as
    | { created_by: number | null }
    | undefined;
  if (!plan) return new NextResponse("plan not found", { status: 404 });
  if (me.role !== "admin" && plan.created_by !== me.id) return new NextResponse("not your plan", { status: 403 });

  const form = await req.formData();
  db.prepare("UPDATE plans SET inclusions = ? WHERE id = ?").run(String(form.get("inclusions") ?? ""), planId);
  return new Response(null, { status: 303, headers: { Location: `/plans/${planId}` } });
}
