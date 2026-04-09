"""
Migration: line_items table cleanup
  - Rename pricing_flag -> category_code
  - Change sort_order from VARCHAR(10) to INTEGER

Idempotent — safe to run multiple times. Called automatically on startup.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from core.database import engine
from sqlalchemy import text


def migrate():
    with engine.connect() as conn:
        # 1. Rename pricing_flag → category_code (no-op if already done)
        try:
            conn.execute(text(
                "ALTER TABLE line_items RENAME COLUMN pricing_flag TO category_code"
            ))
            print("  OK: line_items.pricing_flag → category_code")
        except Exception:
            pass  # column already renamed

        # 2. Change sort_order VARCHAR(10) → INTEGER
        try:
            conn.execute(text("""
                ALTER TABLE line_items
                ALTER COLUMN sort_order TYPE INTEGER
                USING NULLIF(TRIM(sort_order), '')::INTEGER
            """))
            print("  OK: line_items.sort_order VARCHAR → INTEGER")
        except Exception:
            pass  # already integer

        conn.commit()


if __name__ == "__main__":
    migrate()
