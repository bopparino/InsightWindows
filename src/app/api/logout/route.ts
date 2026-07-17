import { destroySession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await destroySession();
  // Relative Location — see login route for why (Railway proxy).
  return new Response(null, { status: 303, headers: { Location: "/login" } });
}
