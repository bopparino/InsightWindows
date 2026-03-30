"""
Adds missing columns to the builders table that were added to the model
after the initial init_db.py run.

Run once:
    python db/migrate_builder_columns.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from core.database import engine
from sqlalchemy import text

COLUMNS = [
    ("cell_phone", "VARCHAR(20)"),
    ("fax",        "VARCHAR(20)"),
    ("email",      "VARCHAR(200)"),
    ("address",    "VARCHAR(200)"),
    ("city",       "VARCHAR(100)"),
    ("state",      "CHAR(2)"),
    ("zip_code",   "VARCHAR(15)"),
]

def migrate():
    with engine.connect() as conn:
        for col, col_type in COLUMNS:
            try:
                conn.execute(text(
                    f"ALTER TABLE builders ADD COLUMN IF NOT EXISTS {col} {col_type}"
                ))
                print(f"  OK: builders.{col}")
            except Exception as e:
                print(f"  SKIP: builders.{col} — {e}")
        conn.commit()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
