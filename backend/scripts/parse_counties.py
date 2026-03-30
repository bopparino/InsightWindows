"""
Loads county reference data from the Access MDB directly into PostgreSQL.

Usage (Windows with Access ODBC driver):
    python scripts/parse_counties.py --mdb "C:/path/to/EstimatorsBidSystemReference.mdb"

Usage (if you exported tbl_valid_county_codes to CSV first):
    python scripts/parse_counties.py --csv "C:/path/to/counties.csv"
"""
import sys, os, argparse
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pandas as pd
from core.database import SessionLocal
from models.models import County


def load_from_df(df: pd.DataFrame, db):
    loaded = skipped = 0
    for _, row in df.iterrows():
        code = str(row.get("Valid County Code", row.get("MetCountyCode", ""))).strip()
        name = str(row.get("Description", "")).strip()
        state = str(row.get("State", "")).strip()[:2]

        if not code or not name or code == "nan":
            skipped += 1
            continue

        existing = db.query(County).filter_by(code=code).first()
        if existing:
            skipped += 1
            continue

        db.add(County(
            code=code,
            name=name,
            state=state,
            permit_fee_notes=str(row.get("Fees", "")) if pd.notna(row.get("Fees")) else None,
            mech_permit_required=str(row.get("MechPermitReq", "")) if pd.notna(row.get("MechPermitReq")) else None,
            inspection_notes=str(row.get("InspectionReq", "")) if pd.notna(row.get("InspectionReq")) else None,
        ))
        loaded += 1

    db.commit()
    print(f"Counties loaded: {loaded}, skipped: {skipped}")


def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--mdb", help="Path to EstimatorsBidSystemReference.mdb")
    group.add_argument("--csv", help="Path to exported counties CSV")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if args.csv:
            df = pd.read_csv(args.csv)
            load_from_df(df, db)
        elif args.mdb:
            try:
                import pyodbc
                conn_str = (
                    r"Driver={Microsoft Access Driver (*.mdb, *.accdb)};"
                    f"DBQ={args.mdb};"
                )
                conn = pyodbc.connect(conn_str)
                df = pd.read_sql("SELECT * FROM [tbl_valid_county_codes]", conn)
                conn.close()
                load_from_df(df, db)
            except ImportError:
                print("pyodbc not installed. Export the table to CSV first and use --csv instead.")
                sys.exit(1)
            except Exception as e:
                print(f"Error reading MDB: {e}")
                print("Tip: Install 'Microsoft Access Database Engine 2016 Redistributable' for pyodbc support.")
                sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
