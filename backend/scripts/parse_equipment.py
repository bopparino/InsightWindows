"""
Equipment price list importer.

Scans a directory for XLS files, selects the most recent file per manufacturer,
wipes all existing equipment data, and imports fresh systems + bundle components.

Usage:
    python scripts/parse_equipment.py --dir "C:/Database/hvac_bid_poc/PRICELIST"
"""
import sys, os, re, argparse
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

import pandas as pd
from datetime import date
from sqlalchemy.orm import Session
from core.database import SessionLocal
from models.models import (EquipmentManufacturer, EquipmentSystem,
                           EquipmentComponent, System as PlanSystem)

MANUFACTURER_MAP = {
    "carrier":      ("CARRIER",      "Carrier"),
    "goodman":      ("GOODMAN",      "Goodman"),
    "rheem":        ("RHEEM",        "Rheem"),
    "lennox":       ("LENNOX",       "Lennox"),
    "trane":        ("TRANE",        "Trane"),
    "daikin":       ("DAIKIN",       "Daikin"),
    "fujitsu":      ("FUJITSU",      "Fujitsu"),
    "comfortmaker": ("COMFORTMAKER", "Comfortmaker"),
    "misc":         ("MISC",         "Miscellaneous"),
}

SKIP_PATTERNS = [
    r'\bold\b',
    r'copy\s+of',
    r'drees',
    r'mckee',
    r'consolidated',
    r'york',           # York 2025 SYSTEM PRICING has no price data yet
]

DEFAULT_COMP_NAMES = ["Furnace", "Coil", "Condenser",
                      "Component 4", "Component 5", "Component 6",
                      "Component 7", "Component 8"]


def normalize(s: str) -> str:
    return re.sub(r'[\s\-_]', '', s).lower()


def should_skip(filename: str) -> bool:
    for pat in SKIP_PATTERNS:
        if re.search(pat, filename, re.IGNORECASE):
            return True
    return False


def extract_year(filename: str) -> int:
    m = re.search(r'(20\d{2})', filename)
    return int(m.group(1)) if m else 0


def pick_best_files(directory: str) -> dict:
    """For each manufacturer pick the most recent non-skipped XLS file."""
    candidates = {}
    for filename in os.listdir(directory):
        if not filename.lower().endswith('.xls'):
            continue
        if should_skip(filename):
            continue
        norm = normalize(os.path.splitext(filename)[0])
        year = extract_year(filename)
        for key in MANUFACTURER_MAP:
            if key in norm:
                if key not in candidates or year > candidates[key][0]:
                    candidates[key] = (year, filename)
                break
    return {k: os.path.join(directory, fname) for k, (_, fname) in candidates.items()}


# ── Column layout detection ────────────────────────────────────

def find_layout(df: pd.DataFrame, data_start: int):
    """
    Scan rows before data_start for a header row that contains both
    'total' and 'bid' (case-insensitive). Returns:
      (component_names: list, total_col: int, bid_col: int)
    Falls back to heuristic-based detection if no header found.
    """
    for i in range(max(0, data_start - 6), data_start):
        row = df.iloc[i]
        vals = [str(v).strip() for v in row]
        lvals = [v.lower() for v in vals]
        if 'total' in lvals and any('bid' in v for v in lvals):
            total_col = lvals.index('total')
            bid_col   = next(j for j, v in enumerate(lvals) if 'bid' in v and j > total_col - 2)
            # Component names are at odd columns 1, 3, 5... up to total_col
            names = []
            for j in range(1, total_col, 2):
                v = vals[j].strip()
                if v.lower() in ('', 'nan'):
                    names.append(DEFAULT_COMP_NAMES[len(names)] if len(names) < len(DEFAULT_COMP_NAMES) else f"Component {len(names)+1}")
                else:
                    names.append(v)
            return names or DEFAULT_COMP_NAMES[:], total_col, bid_col

    return DEFAULT_COMP_NAMES[:], None, None


def find_data_start(df: pd.DataFrame) -> int:
    """First row that looks like an actual data row (system code + two large numerics)."""
    for i, row in df.iterrows():
        vals = [str(v).strip() for v in row if pd.notna(v) and str(v).strip() not in ('', 'nan')]
        if len(vals) < 4:
            continue
        code = vals[0]
        if len(code) < 4 or code.lower() in ('code', 'upflow code', 'system code', 'nan'):
            continue
        # Collect numerics in plausible HVAC price range ($100–$20,000)
        big = [v for v in vals[1:] if _is_price(v)]
        if len(big) >= 2:
            return int(i)
    return 8


def _is_price(v) -> bool:
    try:
        n = float(v)
        return 100 <= n <= 20_000
    except (ValueError, TypeError):
        return False


def get_total_bid(row, total_col, bid_col):
    """
    Extract component_cost and bid_price from row.
    If column indices are known, use those directly.
    Otherwise fall back to filtering numerics in the HVAC price range.
    """
    row_list = list(row)
    if total_col is not None and bid_col is not None:
        try:
            tc = float(row_list[total_col])
            bc = float(row_list[bid_col])
            if tc > 0 and bc > 0:
                return tc, bc
        except (ValueError, TypeError, IndexError):
            pass

    # Fallback: last two values in the plausible price range
    prices = []
    for v in row_list:
        if pd.notna(v) and _is_price(v):
            prices.append(float(v))
    if len(prices) >= 2:
        # The last two large prices are Total then Bid Price
        return prices[-2], prices[-1]
    return None, None


# ── Component extraction ───────────────────────────────────────

def parse_components(row, component_names: list, stop_col) -> list:
    """
    Extract (component_type, model, cost) triples.
    Pairs are (col 1, col 2), (col 3, col 4), ... stopping before stop_col.
    """
    row_list = list(row)
    max_col = stop_col if stop_col is not None else len(row_list)
    components = []
    pair_idx = 0

    for col in range(1, max_col - 1, 2):
        if col + 1 >= max_col:
            break
        model_val = row_list[col]
        cost_val  = row_list[col + 1]

        model_str = str(model_val).strip() if pd.notna(model_val) else ''
        if not model_str or model_str.lower() in ('nan', 'n/a', 'inc.', 'inc', 'total', 'bid price'):
            pair_idx += 1
            continue

        cost_num = None
        if pd.notna(cost_val):
            try:
                n = float(cost_val)
                if 0 < n <= 20_000:
                    cost_num = round(n, 2)
            except (ValueError, TypeError):
                pass

        name = (component_names[pair_idx]
                if pair_idx < len(component_names)
                else f"Component {pair_idx + 1}")

        components.append({
            "sort_order":     pair_idx,
            "component_type": name,
            "model_number":   model_str[:100],
            "cost":           cost_num,
        })
        pair_idx += 1

    return components


def find_section_description(df: pd.DataFrame, row_idx: int) -> str:
    """Look a few rows above for a long descriptive section header."""
    for i in range(row_idx - 1, max(-1, row_idx - 4), -1):
        row = df.iloc[i]
        for v in row:
            s = str(v).strip()
            if len(s) > 25 and s.lower() not in ('nan', '') and not re.search(r'^\d{4}', s):
                return s[:200]
    return ''


# ── Sheet parser ───────────────────────────────────────────────

def parse_system_sheet(df: pd.DataFrame, manufacturer_id: int,
                       db: Session, today: date) -> int:
    data_start = find_data_start(df)
    comp_names, total_col, bid_col = find_layout(df, data_start)
    loaded = 0

    for i in range(data_start, len(df)):
        row = df.iloc[i]
        vals = [str(v).strip() for v in row
                if pd.notna(v) and str(v).strip() not in ('', 'nan')]
        if len(vals) < 3:
            continue

        system_code = str(row.iloc[0]).strip()
        if len(system_code) < 4:
            continue
        if system_code.lower() in ('code', 'upflow code', 'system code'):
            continue

        component_cost, bid_price = get_total_bid(row, total_col, bid_col)
        if not component_cost or not bid_price:
            continue
        if bid_price < component_cost * 0.8 or bid_price > component_cost * 3:
            continue

        desc = find_section_description(df, i)
        if not desc:
            desc = system_code

        components = parse_components(row, comp_names, total_col)

        sys_obj = EquipmentSystem(
            manufacturer_id=manufacturer_id,
            system_code=system_code.upper(),
            description=desc,
            component_cost=round(component_cost, 2),
            bid_price=round(bid_price, 2),
            effective_date=today,
        )
        db.add(sys_obj)
        db.flush()

        for comp in components:
            db.add(EquipmentComponent(system_id=sys_obj.id, **comp))

        loaded += 1

    return loaded


# ── File loader ────────────────────────────────────────────────

def load_file(path: str, db: Session, today: date) -> int:
    filename = os.path.basename(path)
    stem = normalize(os.path.splitext(filename)[0])

    mfr_code, mfr_name = None, None
    for key, (code, name) in MANUFACTURER_MAP.items():
        if key in stem:
            mfr_code, mfr_name = code, name
            break

    if not mfr_code:
        print(f"  SKIP (unknown mfr): {filename}")
        return 0

    try:
        xl = pd.ExcelFile(path, engine='xlrd')
    except Exception as e:
        print(f"  ERROR reading {filename}: {e}")
        return 0

    mfr = db.query(EquipmentManufacturer).filter_by(code=mfr_code).first()
    if not mfr:
        mfr = EquipmentManufacturer(code=mfr_code, name=mfr_name)
        db.add(mfr)
        db.flush()

    total = 0
    for sheet in xl.sheet_names:
        if 'system' in sheet.lower():
            df = pd.read_excel(path, sheet_name=sheet, header=None, engine='xlrd')
            total += parse_system_sheet(df, mfr.id, db, today)

    print(f"  OK: {filename} → {mfr_name}: {total} systems")
    return total


# ── Main ───────────────────────────────────────────────────────

def main(directory: str):
    if not os.path.isdir(directory):
        print(f"Directory not found: {directory}")
        sys.exit(1)

    best = pick_best_files(directory)
    print(f"Selected {len(best)} files:")
    for key, path in sorted(best.items()):
        print(f"  {key:15s} → {os.path.basename(path)}")

    db = SessionLocal()
    try:
        print("\nWiping existing equipment data...")
        db.query(EquipmentComponent).delete(synchronize_session=False)
        db.query(PlanSystem).update({"equipment_system_id": None}, synchronize_session=False)
        db.query(EquipmentSystem).delete(synchronize_session=False)
        db.query(EquipmentManufacturer).delete(synchronize_session=False)
        db.commit()
        print("  Done.\n")

        today = date.today()
        grand_total = 0
        for key in sorted(best):
            grand_total += load_file(best[key], db, today)

        db.commit()
        print(f"\nImport complete — {grand_total} systems loaded.")

    except Exception as e:
        db.rollback()
        print(f"\nERROR: {e}")
        raise
    finally:
        db.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--dir', required=True, help='Path to PRICELIST folder')
    args = parser.parse_args()
    main(args.dir)
