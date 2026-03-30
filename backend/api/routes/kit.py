"""
Kit pricing routes.
GET    /api/kit                       — list all kit items (admin)
POST   /api/kit                       — create kit item
PATCH  /api/kit/{id}                  — update kit item  
DELETE /api/kit/{id}                  — delete kit item
POST   /api/kit/calculate             — calculate kit costs from inputs, return line items
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from core.database import get_db
from core.security import get_current_user, require_admin
from models.models import KitItem

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────

class KitItemIn(BaseModel):
    category:      str
    description:   str
    base_price:    float = 0
    price_per_ton: float = 0
    unit:          str   = "each"
    sort_order:    int   = 10
    active:        bool  = True

class AdditionalItem(BaseModel):
    id:       int
    quantity: float = 1.0

class KitCalcRequest(BaseModel):
    # Sheet metal
    supply_plenum_count:    int   = 0
    return_plenum_count:    int   = 0
    transitions_count:      int   = 0
    # Flex duct
    flex_footage:           float = 0
    # Refrigerant
    lineset_footage:        float = 0
    lineset_insulated:      bool  = True
    # Drain
    drain_footage:          float = 0
    float_switch:           bool  = True
    condensate_pump:        bool  = False
    # Mastic
    mastic_package:         bool  = True
    mastic_fittings:        bool  = True
    # Extras
    canvas_connector:       bool  = False
    locking_caps:           bool  = True
    tonnage:                float = 2.5   # used for per-ton items
    # DB-driven additional items (any kit item not covered above)
    additional_items:       List[AdditionalItem] = []


# ── Routes ────────────────────────────────────────────────────

@router.get("/")
def list_kit_items(db: Session = Depends(get_db), _=Depends(get_current_user)):
    items = db.query(KitItem).filter_by(active=True).order_by(KitItem.sort_order).all()
    return [
        {
            "id":            i.id,
            "category":      i.category,
            "description":   i.description,
            "base_price":    float(i.base_price),
            "price_per_ton": float(i.price_per_ton),
            "unit":          i.unit,
            "sort_order":    i.sort_order,
        }
        for i in items
    ]


@router.post("/", status_code=201)
def create_kit_item(data: KitItemIn, db: Session = Depends(get_db), admin=Depends(require_admin)):
    item = KitItem(**data.model_dump())
    db.add(item)
    db.commit()
    return {"id": item.id}


@router.patch("/{item_id}")
def update_kit_item(item_id: int, data: KitItemIn, db: Session = Depends(get_db), admin=Depends(require_admin)):
    item = db.query(KitItem).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(404, "Kit item not found")
    for k, v in data.model_dump().items():
        setattr(item, k, v)
    db.commit()
    return {"ok": True}


@router.delete("/{item_id}")
def delete_kit_item(item_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    item = db.query(KitItem).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(404, "Kit item not found")
    db.delete(item)
    db.commit()
    return {"ok": True}


@router.post("/calculate")
def calculate_kit(data: KitCalcRequest, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """
    Returns a list of line items ready to be POSTed to the plan.
    Hardcoded items use formula pricing; additional_items use DB prices.
    """
    items = []
    t = data.tonnage

    def add(description, qty, unit_price, category, sort):
        if qty > 0 and unit_price > 0:
            items.append({
                "description":   description,
                "quantity":      round(qty, 2),
                "unit_price":    round(unit_price, 2),
                "extended":      round(qty * unit_price, 2),
                "pricing_flag":  "standard",
                "draw_stage":    None,
                "sort_order":    str(sort),
                "part_number":   None,
                "category":      category,
            })

    # Sheet metal
    if data.supply_plenum_count > 0:
        price = 150 + (t * 25)
        add("Sheet metal — supply plenum", data.supply_plenum_count, price, "sheet_metal", 10)

    if data.return_plenum_count > 0:
        price = 120 + (t * 20)
        add("Sheet metal — return plenum", data.return_plenum_count, price, "sheet_metal", 20)

    if data.transitions_count > 0:
        price = 75 + (t * 10)
        add("Sheet metal — transitions / offsets", data.transitions_count, price, "sheet_metal", 30)

    # Flex duct — priced per foot
    if data.flex_footage > 0:
        add("Flex duct", data.flex_footage, 3.50 + (t * 0.40), "flex_line", 40)
        add("Flex duct connectors / clamps", max(1, round(data.flex_footage / 10)), 6.50, "flex_line", 50)

    # Refrigerant line set — per foot
    if data.lineset_footage > 0:
        base_per_ft = 8.50 + (t * 1.20)
        add("Refrigerant line set — copper", data.lineset_footage, base_per_ft, "refrigerant", 60)
        if data.lineset_insulated:
            add("Refrigerant line insulation (Rubatex R3)", data.lineset_footage, 2.80, "refrigerant", 70)

    if data.locking_caps:
        add("Service valve locking caps", 1, 15.00, "refrigerant", 80)

    # Drain
    if data.drain_footage > 0:
        add("Condensate drain line — PVC", data.drain_footage, 2.20, "drain", 90)

    if data.float_switch:
        add("Float switch", 1, 35.00, "drain", 100)

    if data.condensate_pump:
        add("Condensate pump", 1, 85.00, "drain", 110)

    # Mastic
    if data.mastic_package:
        price = 50 + (t * 8)
        add("Mastic duct sealing package", 1, price, "mastic", 120)

    if data.mastic_fittings:
        add("Mastic — fittings and boots", 1, 30.00, "mastic", 130)

    # Extras
    if data.canvas_connector:
        add("Canvas connector — supply plenum / return riser", 1, 45.00, "misc", 140)

    # DB-driven additional items
    if data.additional_items:
        ids = [ai.id for ai in data.additional_items]
        db_items = {i.id: i for i in db.query(KitItem).filter(KitItem.id.in_(ids), KitItem.active == True).all()}
        for ai in data.additional_items:
            kit_item = db_items.get(ai.id)
            if kit_item and ai.quantity > 0:
                price = float(kit_item.base_price) + float(kit_item.price_per_ton) * t
                add(kit_item.description, ai.quantity, price, kit_item.category, kit_item.sort_order + 200)

    total = sum(i["extended"] for i in items)

    return {
        "items":   items,
        "tonnage": t,
        "total":   round(total, 2),
    }
