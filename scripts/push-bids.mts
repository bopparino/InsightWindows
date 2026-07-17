/**
 * Push a bid bundle (scripts/extract-bids.py) to a running app in chunks.
 *
 *   BIDSYS_SESSION=<cookie value> npx tsx scripts/push-bids.mts bundle.json https://<host>
 *
 * BIDSYS_SESSION is the `bidsys_session` cookie from a logged-in ADMIN
 * browser session. Chunks upsert by plan_nbr, so re-runs are safe.
 */
import { readFileSync } from "node:fs";

const [bundlePath, baseUrl] = process.argv.slice(2);
const session = process.env.BIDSYS_SESSION;
if (!bundlePath || !baseUrl || !session) {
  console.error("usage: BIDSYS_SESSION=<cookie> npx tsx scripts/push-bids.mts <bundle.json> <base-url>");
  process.exit(1);
}

const CHUNK = 100;
const { plans } = JSON.parse(readFileSync(bundlePath, "utf8")) as { plans: unknown[] };
console.log(`${plans.length} plans -> ${baseUrl}`);

let imported = 0;
let updated = 0;
for (let i = 0; i < plans.length; i += CHUNK) {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/admin/import-bids`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `bidsys_session=${session}` },
    body: JSON.stringify({ plans: plans.slice(i, i + CHUNK) }),
  });
  if (!res.ok) {
    console.error(`chunk ${i / CHUNK + 1}: HTTP ${res.status} - ${await res.text()}`);
    process.exit(1);
  }
  const out = (await res.json()) as { imported: number; updated: number };
  imported += out.imported;
  updated += out.updated;
  console.log(`chunk ${i / CHUNK + 1}/${Math.ceil(plans.length / CHUNK)}: +${out.imported} new, ~${out.updated} updated`);
}
console.log(`done: ${imported} imported, ${updated} updated`);
