import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Status transitions. proposed/contracted stamp their dates on first entry;
// the dashboard's Contracted stat reads contracted_at.

const VALID = new Set(["draft", "proposed", "contracted", "lost"]);

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await requireApiUser();
  if (me instanceof Response) return me;
  const { id } = await ctx.params;
  const planId = Number(id);

  const form = await req.formData();
  const status = String(form.get("status") ?? "");
  if (!VALID.has(status)) return new NextResponse("bad status", { status: 400 });
  const row = db.prepare("SELECT created_by FROM plans WHERE id = ?").get(planId) as
    | { created_by: number | null }
    | undefined;
  if (!row) return new NextResponse("plan not found", { status: 404 });
  if (me.role !== "admin" && row.created_by !== me.id) {
    return new NextResponse("not your plan", { status: 403 });
  }

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  db.prepare(
    `UPDATE plans SET status = ?,
       proposed_at   = CASE WHEN ? = 'proposed'   AND proposed_at   IS NULL THEN ? ELSE proposed_at END,
       contracted_at = CASE WHEN ? = 'contracted' AND contracted_at IS NULL THEN ? ELSE contracted_at END
     WHERE id = ?`,
  ).run(status, status, now, status, now, planId);

  return new Response(null, { status: 303, headers: { Location: `/plans/${planId}` } });
}
