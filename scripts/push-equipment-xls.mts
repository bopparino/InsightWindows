/**
 * Bulk-load the current manufacturer XLS files through the upload endpoint,
 * auto-applying each preview. For seeding manufacturers/prices in one shot;
 * day-to-day updates should go through the UI preview.
 *
 *   BIDSYS_SESSION=<cookie> npx tsx scripts/push-equipment-xls.mts "<dir>" https://<host>
 *
 * Reads the UNSUFFIXED files (Carrier.xls, Goodman.xls, …) — those are the
 * "current" pointers in Equipment Downloads.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";

const [dir, baseUrl] = process.argv.slice(2);
const session = process.env.BIDSYS_SESSION;
if (!dir || !baseUrl || !session) {
  console.error('usage: BIDSYS_SESSION=<cookie> npx tsx scripts/push-equipment-xls.mts "<dir>" <base-url>');
  process.exit(1);
}

const KNOWN: Record<string, string> = {
  "carrier.xls": "Carrier",
  "goodman.xls": "Goodman",
  "daikin.xls": "Daikin",
  "lennox.xls": "Lennox",
  "rheem.xls": "Rheem",
  "trane.xls": "Trane",
  "bryant.xls": "Bryant",
  "comfortmaker.xls": "Comfortmaker",
};

const base = baseUrl.replace(/\/$/, "");
const headers = { Cookie: `bidsys_session=${session}` };

for (const f of readdirSync(dir)) {
  const manufacturer = KNOWN[f.toLowerCase()];
  if (!manufacturer) continue;
  const form = new FormData();
  form.set("manufacturer", manufacturer);
  form.set("file", new Blob([readFileSync(join(dir, f))]), basename(f));
  const up = await fetch(`${base}/api/equipment/import`, { method: "POST", headers, body: form, redirect: "manual" });
  const loc = up.headers.get("location") ?? "";
  const id = loc.split("/").pop();
  if (up.status !== 303 || !id) {
    console.error(`${f}: upload failed HTTP ${up.status} - ${await up.text()}`);
    continue;
  }
  const applyForm = new FormData();
  applyForm.set("id", id);
  applyForm.set("action", "apply");
  const ap = await fetch(`${base}/api/equipment/import/apply`, { method: "POST", headers, body: applyForm, redirect: "manual" });
  const result = ap.headers.get("location") ?? "";
  console.log(`${manufacturer}: ${ap.status === 303 ? `applied (${decodeURIComponent(result.split("=")[1] ?? "")} changed+new)` : `apply failed HTTP ${ap.status}`}`);
}
console.log("done");
