import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Partial contact/role update - each little form on the Users page posts only
// the fields it holds.

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await requireApiAdmin();
  if (me instanceof Response) return me;
  const { id } = await ctx.params;
  const userId = Number(id);
  if (!db.prepare("SELECT 1 FROM users WHERE id = ?").get(userId)) {
    return new NextResponse("user not found", { status: 404 });
  }

  const form = await req.formData();
  const sets: string[] = [];
  const vals: (string | number)[] = [];
  for (const field of ["email", "phone"] as const) {
    const v = form.get(field);
    if (v !== null) {
      sets.push(`${field} = ?`);
      vals.push(String(v).trim());
    }
  }
  const newPass = form.get("password");
  if (newPass !== null && String(newPass).length >= 6) {
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(String(newPass)), userId);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  }
  const role = form.get("role");
  if (role !== null) {
    sets.push("role = ?");
    vals.push(String(role) === "admin" ? "admin" : "user");
  }
  if (sets.length) {
    db.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).run(...vals, userId);
  }
  return new Response(null, { status: 303, headers: { Location: "/users" } });
}
