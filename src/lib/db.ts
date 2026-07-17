import "server-only";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { hashPassword } from "@/lib/password";

const DEFAULT_PATH = "./data/bids.db";

declare global {
  // eslint-disable-next-line no-var
  var __bidDb: Database.Database | undefined;
}

function openDb(): Database.Database {
  const path = process.env.DATABASE_PATH ?? DEFAULT_PATH;
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  // Wait out short-lived writer locks instead of throwing SQLITE_BUSY.
  db.pragma("busy_timeout = 5000");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS builders (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      builder_code TEXT
    );

    -- One row per Access plan (PLAN_NBR). Builder/project attribution comes
    -- from the latest Contract row; money fields are aggregates of the lines.
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_nbr TEXT NOT NULL UNIQUE,
      root TEXT NOT NULL DEFAULT '',
      builder_code TEXT NOT NULL DEFAULT '',
      builder_name TEXT NOT NULL DEFAULT '',
      proj_code TEXT NOT NULL DEFAULT '',
      proj_name TEXT NOT NULL DEFAULT '',
      house_types TEXT NOT NULL DEFAULT '',
      total REAL NOT NULL DEFAULT 0,
      lines_count INTEGER NOT NULL DEFAULT 0,
      proposed_at TEXT,
      contracted_at TEXT,
      edited_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_plans_edited ON plans(edited_at);
    CREATE INDEX IF NOT EXISTS idx_plans_builder ON plans(builder_name);

    -- One row per Bidsheet row (a system/zone within a plan). data holds the
    -- full 72-column Access row as JSON so nothing is lost.
    CREATE TABLE IF NOT EXISTS plan_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
      house_nbr TEXT NOT NULL DEFAULT '',
      system_nbr TEXT NOT NULL DEFAULT '',
      work_nbr TEXT NOT NULL DEFAULT '',
      house_type TEXT NOT NULL DEFAULT '',
      part_nbr TEXT NOT NULL DEFAULT '',
      part_cost REAL NOT NULL DEFAULT 0,
      labor_hours REAL NOT NULL DEFAULT 0,
      labor_cost REAL NOT NULL DEFAULT 0,
      factor REAL NOT NULL DEFAULT 0,
      selling REAL NOT NULL DEFAULT 0,
      final_total REAL NOT NULL DEFAULT 0,
      edit_date TEXT,
      data TEXT NOT NULL DEFAULT '{}',
      UNIQUE (plan_id, house_nbr, system_nbr, work_nbr)
    );

    CREATE INDEX IF NOT EXISTS idx_plan_lines_plan ON plan_lines(plan_id);
  `);

  const version = db.pragma("user_version", { simple: true }) as number;
  if (version < 1) {
    db.pragma("user_version = 1");
  }
  if (version < 2) {
    // Master bid files (pricing templates like CS520E11) live among real
    // plans in Access. They stay browsable but are excluded from sales stats.
    const cols = db.prepare("PRAGMA table_info(plans)").all() as { name: string }[];
    if (!cols.some((c) => c.name === "is_master")) {
      db.exec("ALTER TABLE plans ADD COLUMN is_master INTEGER NOT NULL DEFAULT 0");
    }
    db.pragma("user_version = 2");
  }
  if (version < 3) {
    // Pricing layer, imported from data.mdb: the ...cht kit charts become
    // kit_items (is_chart=1 rows are geometry/conversion charts, not prices),
    // Part -> parts, Eqcomp -> eqcomp (equipment bundle -> component models).
    // Every manual price change lands in price_log.
    db.exec(`
      CREATE TABLE IF NOT EXISTS kit_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        code TEXT NOT NULL,
        label TEXT NOT NULL DEFAULT '',
        price REAL,
        per_foot REAL,
        is_chart INTEGER NOT NULL DEFAULT 0,
        extra TEXT NOT NULL DEFAULT '{}',
        price_updated TEXT,
        sort INTEGER NOT NULL DEFAULT 0,
        UNIQUE (category, code)
      );
      CREATE TABLE IF NOT EXISTS parts (
        part_nbr TEXT PRIMARY KEY,
        description TEXT NOT NULL DEFAULT '',
        cost REAL,
        a_cost REAL,
        category TEXT NOT NULL DEFAULT '',
        seer TEXT NOT NULL DEFAULT '',
        eqp_type TEXT NOT NULL DEFAULT '',
        afue TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS eqcomp (
        part_nbr TEXT NOT NULL,
        comp_nbr TEXT NOT NULL,
        PRIMARY KEY (part_nbr, comp_nbr)
      );
      CREATE INDEX IF NOT EXISTS idx_eqcomp_part ON eqcomp(part_nbr);
      CREATE TABLE IF NOT EXISTS price_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        target TEXT NOT NULL,
        field TEXT NOT NULL,
        old_value REAL,
        new_value REAL,
        changed_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    db.pragma("user_version = 3");
  }

  // Seed the first admin so a fresh deploy is loggable-into. Password comes
  // from ADMIN_PASSWORD at first boot; change it after first login.
  const userCount = (db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;
  if (userCount === 0) {
    const pw = process.env.ADMIN_PASSWORD ?? "metcalfe";
    // OR IGNORE: Next's build workers open the DB in parallel and can race
    // this seed; losing the race is fine, the row exists either way.
    db.prepare(
      "INSERT OR IGNORE INTO users (username, password_hash, display_name, role) VALUES ('admin', ?, 'Administrator', 'admin')",
    ).run(hashPassword(pw));
  }
}

// Lazy connection: Next's build spawns parallel workers that all import this
// module during page-data collection, and an eager openDb() would have every
// worker running migrate() + the admin seed against the same file at once
// (SQLITE_BUSY). The Proxy defers opening until the first actual query, which
// only happens at runtime.
export const db: Database.Database = new Proxy({} as Database.Database, {
  get(_target, prop) {
    const real = (globalThis.__bidDb ??= openDb());
    const value = Reflect.get(real, prop);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
