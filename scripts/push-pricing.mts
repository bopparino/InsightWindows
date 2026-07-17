/**
 * Push a pricing bundle (scripts/extract-pricing.py) to a running app.
 *
 *   BIDSYS_SESSION=<cookie value> npx tsx scripts/push-pricing.mts pricing.json https://<host>
 *
 * Idempotent: kit items and parts upsert; eqcomp is replaced wholesale.
 */
import { readFileSync } from "node:fs";

const [bundlePath, baseUrl] = process.argv.slice(2);
const session = process.env.BIDSYS_SESSION;
if (!bundlePath || !baseUrl || !session) {
  console.error("usage: BIDSYS_SESSION=<cookie> npx tsx scripts/push-pricing.mts <pricing.json> <base-url>");
  process.exit(1);
}

const bundle = JSON.parse(readFileSync(bundlePath, "utf8"));
const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/admin/import-pricing`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: `bidsys_session=${session}` },
  body: JSON.stringify(bundle),
});
if (!res.ok) {
  console.error(`HTTP ${res.status} - ${await res.text()}`);
  process.exit(1);
}
console.log(await res.json());
