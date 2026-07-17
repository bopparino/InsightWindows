import { db } from "@/lib/db";
import { requireApiAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// À-la-carte price edits from the Price Book / Equipment pages. Admin only;
// every change lands in price_log with who/old/new. Relative redirect back.

const KIT_FIELDS = new Set(["price", "per_foot"]);
const PART_FIELDS = new Set(["cost", "a_cost"]);

export async function POST(req: Request) {
  const me = await requireApiAdmin();
  if (me instanceof Response) return me;

  const form = await req.formData();
  const kind = String(form.get("kind") ?? "");
  const field = String(form.get("field") ?? "");
  const raw = String(form.get("value") ?? "").replace(/[$,\s]/g, "");
  const back = String(form.get("back") ?? "/pricing");
  const value = raw === "" ? null : Number(raw);
  if (value !== null && !Number.isFinite(value)) {
    return new Response("bad value", { status: 400 });
  }
  const safeBack = back.startsWith("/") ? back : "/pricing";

  if (kind === "kit" && KIT_FIELDS.has(field)) {
    const id = Number(form.get("id"));
    const row = db.prepare("SELECT category, code, price, per_foot FROM kit_items WHERE id = ?").get(id) as
      | { category: string; code: string; price: number | null; per_foot: number | null }
      | undefined;
    if (!row) return new Response("not found", { status: 404 });
    const old = field === "price" ? row.price : row.per_foot;
    if (old !== value) {
      db.prepare(`UPDATE kit_items SET ${field} = ?, price_updated = date('now') WHERE id = ?`).run(value, id);
      db.prepare(
        "INSERT INTO price_log (username, target, field, old_value, new_value) VALUES (?, ?, ?, ?, ?)",
      ).run(me.username, `${row.category} · ${row.code}`, field, old, value);
    }
  } else if (kind === "part" && PART_FIELDS.has(field)) {
    const partNbr = String(form.get("part_nbr") ?? "");
    const row = db.prepare("SELECT cost, a_cost FROM parts WHERE part_nbr = ?").get(partNbr) as
      | { cost: number | null; a_cost: number | null }
      | undefined;
    if (!row) return new Response("not found", { status: 404 });
    const old = field === "cost" ? row.cost : row.a_cost;
    if (old !== value) {
      db.prepare(`UPDATE parts SET ${field} = ? WHERE part_nbr = ?`).run(value, partNbr);
      db.prepare(
        "INSERT INTO price_log (username, target, field, old_value, new_value) VALUES (?, ?, ?, ?, ?)",
      ).run(me.username, `Part · ${partNbr}`, field, old, value);
    }
  } else {
    return new Response("bad target", { status: 400 });
  }

  return new Response(null, { status: 303, headers: { Location: safeBack } });
}
