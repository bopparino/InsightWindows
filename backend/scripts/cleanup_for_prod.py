"""
Pre-production data cleanup script.

Performs:
  1. Migrate stale 'estimator' role -> 'account_manager'
  2. Remove the ABC123 test project and its lone demo plan
  3. Report on accounts that need manual review before go-live

Run dry (report only):
    .venv/Scripts/python.exe scripts/cleanup_for_prod.py --dry-run

Run for real:
    .venv/Scripts/python.exe scripts/cleanup_for_prod.py
"""
import sys
import psycopg2

DB_DSN  = "postgresql://postgres:bullet@localhost:5432/hvac_poc"
DRY_RUN = "--dry-run" in sys.argv

def main():
    conn = psycopg2.connect(DB_DSN)
    conn.autocommit = False
    cur  = conn.cursor()

    mode = "[DRY RUN] " if DRY_RUN else ""
    print(f"\n{'='*60}")
    print(f"  {mode}Pre-production data cleanup")
    print(f"{'='*60}\n")

    # ── 1. Fix stale role names ───────────────────────────────
    cur.execute("SELECT id, username, full_name FROM users WHERE role = 'estimator'")
    stale = cur.fetchall()
    print(f"1. Stale 'estimator' role -> 'account_manager'  ({len(stale)} users)")
    for uid, uname, fname in stale:
        print(f"   {uname:20s}  ({fname})")
        if not DRY_RUN:
            cur.execute("UPDATE users SET role = 'account_manager' WHERE id = %s", (uid,))
    if not stale:
        print("   None found — already clean.")

    # ── 2. Remove ABC123 test project + its plans ─────────────
    print()
    cur.execute("SELECT id, code, name FROM projects WHERE code = 'ABC123'")
    test_proj = cur.fetchone()
    if test_proj:
        proj_id = test_proj[0]
        cur.execute("SELECT id, plan_number, status FROM plans WHERE project_id = %s", (proj_id,))
        test_plans = cur.fetchall()
        print(f"2. Remove test project '{test_proj[1]}' ({test_proj[2]}) + {len(test_plans)} plan(s)")
        for pid, pnum, pstatus in test_plans:
            print(f"   Plan {pnum} ({pstatus})")
            if not DRY_RUN:
                # Cascade: house_types -> systems -> line_items, draws, documents
                cur.execute("DELETE FROM event_log   WHERE plan_id = %s", (pid,))
                cur.execute("DELETE FROM documents   WHERE plan_id = %s", (pid,))
                cur.execute("""
                    DELETE FROM line_items WHERE system_id IN (
                        SELECT s.id FROM systems s
                        JOIN house_types ht ON s.house_type_id = ht.id
                        WHERE ht.plan_id = %s)""", (pid,))
                cur.execute("""
                    DELETE FROM systems WHERE house_type_id IN (
                        SELECT id FROM house_types WHERE plan_id = %s)""", (pid,))
                cur.execute("DELETE FROM draws      WHERE house_type_id IN (SELECT id FROM house_types WHERE plan_id = %s)", (pid,))
                cur.execute("DELETE FROM house_types WHERE plan_id = %s", (pid,))
                cur.execute("DELETE FROM plans WHERE id = %s", (pid,))
        if not DRY_RUN:
            cur.execute("DELETE FROM projects WHERE id = %s", (proj_id,))
    else:
        print("2. Test project ABC123 — not found (already removed).")

    # ── 3. Manual review report ───────────────────────────────
    print()
    print("3. Accounts requiring manual review before go-live:")

    cur.execute("SELECT username, full_name, role, email, active FROM users ORDER BY active DESC, role")
    users = cur.fetchall()
    print(f"\n   {'USERNAME':20s} {'FULL NAME':25s} {'ROLE':20s} {'ACTIVE':6s} NOTES")
    print(f"   {'-'*20} {'-'*25} {'-'*20} {'-'*6} -----")
    for uname, fname, role, email, active in users:
        notes = []
        if uname == 'admin':           notes.append("generic admin — rename or disable for prod")
        if uname == 'manager':         notes.append("0 plans — confirm needed")
        if not active:                 notes.append("inactive")
        if role == 'account_manager' and not active:
            notes.append("can't log in anyway")
        note_str = "; ".join(notes) if notes else "OK"
        print(f"   {uname:20s} {fname:25s} {role:20s} {str(active):6s} {note_str}")

    # ── 4. Equipment pricing gaps ─────────────────────────────
    print()
    cur.execute("SELECT COUNT(*) FROM equipment_systems WHERE component_cost = 0 AND bid_price = 0")
    zero_cost = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM equipment_systems")
    total_equip = cur.fetchone()[0]
    print(f"4. Equipment pricing: {zero_cost}/{total_equip} systems have $0 cost and $0 bid price")
    print(f"   -> These will show $0.00 in plan line items. Populate before go-live.")

    # ── Commit or rollback ────────────────────────────────────
    print()
    if DRY_RUN:
        conn.rollback()
        print("DRY RUN complete — no changes made. Re-run without --dry-run to apply.")
    else:
        conn.commit()
        print("Cleanup committed successfully.")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
