import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const me = await requireApiAdmin();
  if (me instanceof Response) return me;

  const form = await req.formData();
  const username = String(form.get("username") ?? "").trim().toLowerCase();
  const displayName = String(form.get("displayName") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const role = String(form.get("role") ?? "user") === "admin" ? "admin" : "user";
  const email = String(form.get("email") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  if (!username || !displayName || password.length < 6) {
    return new NextResponse("username, name, and a 6+ char password are required", { status: 400 });
  }
  if (db.prepare("SELECT 1 FROM users WHERE username = ?").get(username)) {
    return new NextResponse(`username ${username} is taken`, { status: 409 });
  }
  db.prepare(
    "INSERT INTO users (username, password_hash, display_name, role, email, phone) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(username, hashPassword(password), displayName, role, email, phone);

  return new Response(null, { status: 303, headers: { Location: "/users" } });
}
