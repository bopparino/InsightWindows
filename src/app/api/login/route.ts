import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const form = await req.formData();
  const username = String(form.get("username") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = db
    .prepare("SELECT id, password_hash FROM users WHERE username = ?")
    .get(username) as { id: number; password_hash: string } | undefined;
  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.redirect(new URL("/login?err=1", req.url), 303);
  }
  await createSession(user.id);
  return NextResponse.redirect(new URL("/", req.url), 303);
}
