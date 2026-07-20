import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser, SESSION_COOKIE } from "@/lib/auth";
import puppeteer from "puppeteer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server-side PDF: headless Chromium renders the app's own print route
// (quote or contract) carrying the caller's session cookie, and streams the
// PDF back as a download. Same recipe as the cut-sheet program.

const KINDS = new Set(["quote", "contract"]);

export async function GET(req: Request, ctx: { params: Promise<{ kind: string; id: string }> }) {
  const me = await requireApiUser();
  if (me instanceof Response) return me;
  const { kind, id } = await ctx.params;
  if (!KINDS.has(kind)) return new NextResponse("bad kind", { status: 400 });
  const planId = Number(id);
  const plan = db.prepare("SELECT plan_nbr, created_by, deleted_at FROM plans WHERE id = ?").get(planId) as
    | { plan_nbr: string; created_by: number | null; deleted_at: string | null }
    | undefined;
  if (!plan || plan.deleted_at) return new NextResponse("plan not found", { status: 404 });
  if (me.role !== "admin" && plan.created_by !== me.id) return new NextResponse("not your plan", { status: 403 });

  const token = req.headers.get("cookie")?.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1];
  if (!token) return new NextResponse("no session", { status: 401 });

  const port = process.env.PORT ?? "3000";
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.setCookie({ name: SESSION_COOKIE, value: token, domain: "localhost", path: "/" });
    await page.goto(`http://localhost:${port}/${kind}/${planId}`, { waitUntil: "networkidle0", timeout: 30000 });
    const pdf = await page.pdf({
      format: "letter",
      printBackground: true,
      margin: { top: "0.6in", bottom: "0.6in", left: "0.6in", right: "0.6in" },
    });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${plan.plan_nbr}-${kind}.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
