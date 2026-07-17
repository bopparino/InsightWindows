import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const plans = (db.prepare("SELECT COUNT(*) AS n FROM plans").get() as { n: number }).n;
  return NextResponse.json({ ok: true, plans });
}
