import "server-only";
import { db } from "@/lib/db";

export function getSetting(key: string): string {
  return (db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined)?.value ?? "";
}

export function getSettings(keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) out[k] = getSetting(k);
  return out;
}

export function setSetting(key: string, value: string): void {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").run(key, value);
}

export const COMPANY_KEYS = [
  "company_name", "company_address1", "company_address2", "company_phone", "company_fax",
  "company_license", "quote_terms", "contract_exclusions",
];
