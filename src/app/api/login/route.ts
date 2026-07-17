import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Redirects use RELATIVE Location headers on purpose: behind Railway's proxy
// req.url is the container's own address (http://localhost:8080/...), so an
// absolute redirect built from it sends the browser to localhost. A relative
// Location resolves against whatever host the user is actually on.
const seeOther = (path: string) => new Response(null, { status: 303, headers: { Location: path } });

export async function POST(req: Request) {
  const form = await req.formData();
  const username = String(form.get("username") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = db
    .prepare("SELECT id, password_hash FROM users WHERE username = ?")
    .get(username) as { id: number; password_hash: string } | undefined;
  if (!user || !verifyPassword(password, user.password_hash)) {
    return seeOther("/login?err=1");
  }
  await createSession(user.id);
  return seeOther("/");
}
