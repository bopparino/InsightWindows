/**
 * Push a composition bundle (scripts/extract-details.py) in whole-plan chunks.
 *
 *   BIDSYS_SESSION=<cookie value> npx tsx scripts/push-details.mts details.json https://<host>
 */
import { readFileSync } from "node:fs";

const [bundlePath, baseUrl] = process.argv.slice(2);
const session = process.env.BIDSYS_SESSION;
if (!bundlePath || !baseUrl || !session) {
  console.error("usage: BIDSYS_SESSION=<cookie> npx tsx scripts/push-details.mts <details.json> <base-url>");
  process.exit(1);
}

type Detail = { plan_nbr: string };
const { details } = JSON.parse(readFileSync(bundlePath, "utf8")) as { details: Detail[] };

// Group by plan so the server's replace-per-plan semantics stay correct.
const byPlan = new Map<string, Detail[]>();
for (const d of details) {
  const g = byPlan.get(d.plan_nbr) ?? [];
  g.push(d);
  byPlan.set(d.plan_nbr, g);
}
console.log(`${details.length} detail lines across ${byPlan.size} plans -> ${baseUrl}`);

const MAX = 5000;
let batch: Detail[] = [];
let inserted = 0;
let unmatched = 0;
let sent = 0;

async function flush() {
  if (!batch.length) return;
  sent++;
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/admin/import-details`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `bidsys_session=${session}` },
    body: JSON.stringify({ details: batch }),
  });
  if (!res.ok) {
    console.error(`batch ${sent}: HTTP ${res.status} - ${await res.text()}`);
    process.exit(1);
  }
  const out = (await res.json()) as { inserted: number; unmatched: number };
  inserted += out.inserted;
  unmatched += out.unmatched;
  console.log(`batch ${sent}: +${out.inserted} (${out.unmatched} unmatched)`);
  batch = [];
}

for (const [, rows] of byPlan) {
  if (batch.length && batch.length + rows.length > MAX) await flush();
  batch.push(...rows);
}
await flush();
console.log(`done: ${inserted} inserted, ${unmatched} on plans not in the app`);
