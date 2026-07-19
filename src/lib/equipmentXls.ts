import * as XLSX from "xlsx";

// Parser for the manufacturer "COMPONT PRICING" sheets (Dave's per-brand
// price files, BIFF .xls). Layout is consistent across brands: column B holds
// the model number, column C the price, column E the description. Section
// header rows carry an Excel date serial (>40000) in the price column and
// no real description - skipped by the price sanity bound.

export type ParsedPart = { partNbr: string; description: string; price: number };

export function parseComponentSheet(buf: Buffer): { rows: ParsedPart[]; sheet: string } {
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheetName = wb.SheetNames.find((n) => n.toUpperCase().includes("COMPON"));
  if (!sheetName) throw new Error(`no COMPONT PRICING sheet (found: ${wb.SheetNames.join(", ")})`);
  const grid = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
    header: 1,
    raw: true,
    defval: "",
  });

  const rows: ParsedPart[] = [];
  const seen = new Set<string>();
  for (const row of grid) {
    const model = String(row[1] ?? "").trim().replace(/\s+/g, " ");
    const price = row[2];
    const desc = String(row[4] ?? "").trim();
    if (!model || typeof price !== "number") continue;
    if (price <= 0 || price >= 40000) continue; // date serials & section rows
    if (desc.toUpperCase().startsWith("DESCRIPTION")) continue;
    if (seen.has(model)) continue; // first occurrence wins within a file
    seen.add(model);
    rows.push({ partNbr: model, description: desc, price: Math.round(price * 100) / 100 });
  }
  return { rows, sheet: sheetName };
}

export const MANUFACTURERS = [
  "Carrier",
  "Goodman",
  "Daikin",
  "Lennox",
  "Rheem",
  "Trane",
  "York",
  "Bryant",
  "Comfortmaker",
  "Miscellaneous",
];
