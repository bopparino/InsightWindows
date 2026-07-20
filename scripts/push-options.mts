/**
 * BIDSYS_SESSION=<cookie value> npx tsx scripts/push-options.mts options.json https://<host>
 */
import { readFileSync } from "node:fs";

const [bundlePath, baseUrl] = process.argv.slice(2);
const session = process.env.BIDSYS_SESSION;
if (!bundlePath || !baseUrl || !session) {
  console.error("usage: BIDSYS_SESSION=<cookie> npx tsx scripts/push-options.mts <options.json> <base-url>");
  process.exit(1);
}
const { options } = JSON.parse(readFileSync(bundlePath, "utf8")) as { options: unknown[] };
const CHUNK = 5000;
for (let i = 0; i < options.length; i += CHUNK) {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/admin/import-options`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `bidsys_session=${session}` },
    body: JSON.stringify({ options: options.slice(i, i + CHUNK) }),
  });
  if (!res.ok) {
    console.error(`chunk ${i / CHUNK + 1}: HTTP ${res.status} - ${await res.text()}`);
    process.exit(1);
  }
  console.log(`chunk ${i / CHUNK + 1}/${Math.ceil(options.length / CHUNK)} ok`);
}
console.log(`done: ${options.length} option rows`);
