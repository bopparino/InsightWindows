import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Soft delete (owner or admin) -> trash. Restore and purge (hard delete,
// cascades lines/details) are admin-only, driven from the Admin trash.

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await requireApiUser();
  if (me instanceof Response) return me;
  const { id } = await ctx.params;
  const planId = Number(id);
  const plan = db.prepare("SELECT created_by, deleted_at FROM plans WHERE id = ?").get(planId) as
    | { created_by: number | null; deleted_at: string | null }
    | undefined;
  if (!plan) return new NextResponse("plan not found", { status: 404 });

  const form = await req.formData();
  const action = String(form.get("action") ?? "trash");

  if (action === "trash") {
    if (me.role !== "admin" && plan.created_by !== me.id) return new NextResponse("not your plan", { status: 403 });
    db.prepare("UPDATE plans SET deleted_at = datetime('now') WHERE id = ?").run(planId);
    return new Response(null, { status: 303, headers: { Location: "/plans" } });
  }
  if (me.role !== "admin") return new NextResponse("admin only", { status: 403 });
  if (action === "restore") {
    db.prepare("UPDATE plans SET deleted_at = NULL WHERE id = ?").run(planId);
  } else if (action === "purge") {
    db.prepare("DELETE FROM plans WHERE id = ?").run(planId); // cascades lines + details
  }
  return new Response(null, { status: 303, headers: { Location: "/admin" } });
}
