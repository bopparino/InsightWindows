"""
Wipe all demo/test data from the database.

Deletes: plans (+ systems, line items, documents, comments, tasks),
         builders, projects, house_types.

PRESERVES: kit_variants, kit_components, equipment, users,
           company_settings, counties.

Run ONCE before real estimators start using the system:
    python db/wipe_demo_data.py

Prompts for confirmation before doing anything.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from core.database import engine
from sqlalchemy import text


STEPS = [
    # Order matters — foreign keys cascade but explicit order is cleaner
    ("line_item_components",  "DELETE FROM line_item_components"),
    ("line_items",            "DELETE FROM line_items"),
    ("draws",                 "DELETE FROM draws"),
    ("documents",             "DELETE FROM documents"),
    ("event_logs",            "DELETE FROM event_logs"),
    ("plan_comments",         "DELETE FROM plan_comments"),
    ("plan_tasks",            "DELETE FROM plan_tasks"),
    ("systems",               "DELETE FROM systems"),
    ("house_types",           "DELETE FROM house_types"),
    ("plans",                 "DELETE FROM plans"),
    ("projects",              "DELETE FROM projects"),
    ("builders",              "DELETE FROM builders"),
    ("suggestions",           "DELETE FROM suggestions"),
]


def main():
    print("\n⚠  WIPE DEMO DATA")
    print("=" * 50)
    print("This will permanently delete ALL plans, projects,")
    print("builders, and house types from the database.")
    print()
    print("PRESERVED: kit variants/components, equipment,")
    print("           users, company settings, counties.")
    print()
    confirm = input("Type  yes  to proceed: ").strip().lower()
    if confirm != "yes":
        print("Aborted.")
        sys.exit(0)

    print()
    with engine.connect() as conn:
        for label, sql in STEPS:
            result = conn.execute(text(sql))
            print(f"  {label}: {result.rowcount} rows deleted")
        conn.commit()

    print()
    print("Done. Database is clean for real use.")


if __name__ == "__main__":
    main()
