import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Step 2: apply (or discard) a pending manufacturer price import. Updates
// costs, claims the manufacturer on every touched part, logs every change.

export async function POST(req: Request) {
  const me = await requireApiAdmin();
  if (me instanceof Response) return me;

  const form = await req.formData();
  const id = Number(form.get("id"));
  const action = String(form.get("action") ?? "apply");
  const row = db.prepare("SELECT * FROM pending_imports WHERE id = ?").get(id) as
    | { id: number; manufacturer: string; filename: string; payload: string }
    | undefined;
  if (!row) return new NextResponse("pending import not found", { status: 404 });

  if (action === "discard") {
    db.prepare("DELETE FROM pending_imports WHERE id = ?").run(id);
    return new Response(null, { status: 303, headers: { Location: "/equipment/import" } });
  }

  const payload = JSON.parse(row.payload) as {
    updates: { partNbr: string; description: string; oldCost: number | null; newCost: number }[];
    added: { partNbr: string; description: string; newCost: number }[];
    unchanged: string[];
  };

  const update = db.prepare(
    `UPDATE parts SET cost = ?, manufacturer = ?,
       description = CASE WHEN description = '' THEN ? ELSE description END
     WHERE part_nbr = ?`,
  );
  const insert = db.prepare(
    "INSERT INTO parts (part_nbr, description, cost, manufacturer) VALUES (?, ?, ?, ?)",
  );
  const claim = db.prepare("UPDATE parts SET manufacturer = ? WHERE part_nbr = ?");
  const log = db.prepare(
    "INSERT INTO price_log (username, target, field, old_value, new_value) VALUES (?, ?, 'cost', ?, ?)",
  );

  db.transaction(() => {
    for (const u of payload.updates) {
      update.run(u.newCost, row.manufacturer, u.description, u.partNbr);
      log.run(me.username, `Part · ${u.partNbr} (${row.manufacturer} ${row.filename})`, u.oldCost, u.newCost);
    }
    for (const a of payload.added) {
      insert.run(a.partNbr, a.description, a.newCost, row.manufacturer);
      log.run(me.username, `Part · ${a.partNbr} (${row.manufacturer} ${row.filename}, new)`, null, a.newCost);
    }
    // Unchanged parts still get claimed by this manufacturer so grouping fills in.
    for (const pn of payload.unchanged) claim.run(row.manufacturer, pn);
    db.prepare("DELETE FROM pending_imports WHERE id = ?").run(id);
  })();

  return new Response(null, {
    status: 303,
    headers: { Location: `/equipment?imported=${payload.updates.length}+${payload.added.length}` },
  });
}
