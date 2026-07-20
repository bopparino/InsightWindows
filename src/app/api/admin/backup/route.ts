import { db } from "@/lib/db";
import { requireApiAdmin } from "@/lib/auth";
import { mkdirSync, readFileSync, readdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One-click backup: snapshots the live SQLite (safe while running - uses the
// SQLite backup API via VACUUM INTO), keeps the last 10 copies next to the
// database, and streams the new snapshot down to the admin's browser.

export async function GET() {
  const me = await requireApiAdmin();
  if (me instanceof Response) return me;

  const dataDir = dirname(process.env.DATABASE_PATH ?? "./data/bids.db");
  const backupDir = join(dataDir, "backups");
  mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const file = join(backupDir, `bids-${stamp}.db`);
  db.prepare("VACUUM INTO ?").run(file);

  // retention: newest 10
  const all = readdirSync(backupDir).filter((f) => f.endsWith(".db")).sort();
  for (const old of all.slice(0, Math.max(0, all.length - 10))) unlinkSync(join(backupDir, old));

  const bytes = readFileSync(file);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="bids-${stamp}.db"`,
    },
  });
}
