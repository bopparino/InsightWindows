import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiAdmin } from "@/lib/auth";
import { parseComponentSheet, MANUFACTURERS } from "@/lib/equipmentXls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Step 1 of the pricing upload: parse the XLS, diff against current parts,
// stash as a pending import, and send the admin to the preview page.
// Nothing changes until Apply.

export async function POST(req: Request) {
  const me = await requireApiAdmin();
  if (me instanceof Response) return me;

  const form = await req.formData();
  const manufacturer = String(form.get("manufacturer") ?? "");
  const file = form.get("file");
  if (!MANUFACTURERS.includes(manufacturer)) return new NextResponse("pick a manufacturer", { status: 400 });
  if (!(file instanceof File)) return new NextResponse("no file", { status: 400 });

  let parsed;
  try {
    parsed = parseComponentSheet(Buffer.from(await file.arrayBuffer()));
  } catch (err) {
    return new NextResponse(`could not parse: ${err instanceof Error ? err.message : "unknown"}`, { status: 400 });
  }

  const lookup = db.prepare("SELECT cost, manufacturer, description FROM parts WHERE part_nbr = ?");
  const updates: { partNbr: string; description: string; oldCost: number | null; newCost: number; prevManufacturer: string }[] = [];
  const unchanged: string[] = [];
  const added: { partNbr: string; description: string; newCost: number }[] = [];
  for (const r of parsed.rows) {
    const existing = lookup.get(r.partNbr) as
      | { cost: number | null; manufacturer: string; description: string }
      | undefined;
    if (!existing) {
      added.push({ partNbr: r.partNbr, description: r.description, newCost: r.price });
    } else if (existing.cost !== r.price) {
      updates.push({
        partNbr: r.partNbr,
        description: r.description || existing.description,
        oldCost: existing.cost,
        newCost: r.price,
        prevManufacturer: existing.manufacturer,
      });
    } else {
      unchanged.push(r.partNbr);
    }
  }

  const payload = { updates, added, unchanged, sheet: parsed.sheet, totalParsed: parsed.rows.length };
  const id = Number(
    db
      .prepare("INSERT INTO pending_imports (manufacturer, filename, username, payload) VALUES (?, ?, ?, ?)")
      .run(manufacturer, file.name, me.username, JSON.stringify(payload)).lastInsertRowid,
  );

  return new Response(null, { status: 303, headers: { Location: `/equipment/import/${id}` } });
}
