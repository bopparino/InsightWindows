"""
Kit pricing routes — v2 (2019 Kit Prices structure)

GET  /api/kit/variants                          — all variants grouped by category
GET  /api/kit/variants/flat                     — flat list (admin)
POST /api/kit/variants                          — create variant (admin)
PATCH /api/kit/variants/{id}                    — update variant (admin)
DELETE /api/kit/variants/{id}                   — delete variant (admin)

GET  /api/kit/variants/{id}/components          — list template components
POST /api/kit/variants/{id}/components          — add component to template (admin)
PATCH /api/kit/components/{id}                  — update template component (admin)
DELETE /api/kit/components/{id}                 — remove template component (admin)

GET  /api/kit/line-items/{line_item_id}/components   — bid-instance components
PATCH /api/kit/line-item-components/{id}             — edit qty / toggle excluded (estimator)
DELETE /api/kit/line-item-components/{id}            — hard-remove from this bid
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from core.database import get_db
from core.security import get_current_user, require_admin
from models.models import KitVariant, KitComponent, LineItemComponent

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────

class KitVariantIn(BaseModel):
    category_code:  str
    category_name:  str
    variant_code:   str
    variant_name:   str
    per_kit:        float = 0
    per_foot:       float = 0
    markup_divisor: float = 1.0
    sort_order:     int   = 10
    active:         bool  = True


class KitComponentIn(BaseModel):
    description: str
    part_number: Optional[str] = None
    quantity:    float = 1
    unit_cost:   float = 0
    sort_order:  int   = 10


class KitComponentUpdate(BaseModel):
    description: Optional[str]   = None
    part_number: Optional[str]   = None
    quantity:    Optional[float] = None
    unit_cost:   Optional[float] = None
    sort_order:  Optional[int]   = None


class LineItemComponentUpdate(BaseModel):
    quantity:    Optional[float] = None
    excluded:    Optional[bool]  = None
    description: Optional[str]   = None
    part_number: Optional[str]   = None
    unit_cost:   Optional[float] = None


# ── Serializers ───────────────────────────────────────────────

def _serialize(v: KitVariant) -> dict:
    divisor = float(v.markup_divisor) if v.markup_divisor else 1.0
    per_kit = float(v.per_kit)
    return {
        "id":              v.id,
        "category_code":   v.category_code,
        "category_name":   v.category_name,
        "variant_code":    v.variant_code,
        "variant_name":    v.variant_name,
        "per_kit":         per_kit,            # bid price (builder pays this)
        "per_foot":        float(v.per_foot),
        "markup_divisor":  divisor,
        "internal_cost":   round(per_kit * divisor, 4),  # Metcalfe's cost
        "margin_pct":      round((1 - divisor) * 100, 1) if divisor < 1.0 else 0.0,
        "sort_order":      v.sort_order,
    }


def _serialize_kit_component(c: KitComponent) -> dict:
    return {
        "id":          c.id,
        "sort_order":  c.sort_order,
        "description": c.description,
        "part_number": c.part_number,
        "quantity":    float(c.quantity),
        "unit_cost":   float(c.unit_cost),
    }


def _serialize_lic(c: LineItemComponent) -> dict:
    return {
        "id":               c.id,
        "kit_component_id": c.kit_component_id,
        "sort_order":       c.sort_order,
        "description":      c.description,
        "part_number":      c.part_number,
        "quantity":         float(c.quantity),
        "unit_cost":        float(c.unit_cost),
        "excluded":         bool(c.excluded),
        "extended_cost":    round(float(c.quantity) * float(c.unit_cost), 4),
    }


# ── Variant Routes ────────────────────────────────────────────

@router.get("/variants")
def list_variants(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Returns variants grouped by category, sorted by category sort then variant sort."""
    rows = (db.query(KitVariant)
              .filter_by(active=True)
              .order_by(KitVariant.category_code, KitVariant.sort_order)
              .all())

    seen = {}
    for v in rows:
        if v.category_code not in seen:
            seen[v.category_code] = {
                "code": v.category_code,
                "name": v.category_name,
                "variants": [],
            }
        seen[v.category_code]["variants"].append(_serialize(v))

    return list(seen.values())


@router.get("/variants/flat")
def list_variants_flat(db: Session = Depends(get_db), _=Depends(require_admin)):
    rows = (db.query(KitVariant)
              .order_by(KitVariant.category_code, KitVariant.sort_order)
              .all())
    return [_serialize(v) for v in rows]


@router.post("/variants", status_code=201)
def create_variant(data: KitVariantIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    v = KitVariant(**data.model_dump())
    db.add(v)
    db.commit()
    return _serialize(v)


@router.patch("/variants/{variant_id}")
def update_variant(variant_id: int, data: KitVariantIn,
                   db: Session = Depends(get_db), _=Depends(require_admin)):
    v = db.query(KitVariant).filter_by(id=variant_id).first()
    if not v:
        raise HTTPException(404, "Kit variant not found")
    for k, val in data.model_dump().items():
        setattr(v, k, val)
    db.commit()
    return _serialize(v)


@router.delete("/variants/{variant_id}")
def delete_variant(variant_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    v = db.query(KitVariant).filter_by(id=variant_id).first()
    if not v:
        raise HTTPException(404, "Kit variant not found")
    v.active = False
    db.commit()
    return {"ok": True}


# ── KitComponent (template) Routes ────────────────────────────

@router.get("/variants/{variant_id}/components")
def list_kit_components(variant_id: int,
                        db: Session = Depends(get_db), _=Depends(get_current_user)):
    v = db.query(KitVariant).filter_by(id=variant_id).first()
    if not v:
        raise HTTPException(404, "Kit variant not found")
    return [_serialize_kit_component(c) for c in v.kit_components]


@router.post("/variants/{variant_id}/components", status_code=201)
def add_kit_component(variant_id: int, data: KitComponentIn,
                      db: Session = Depends(get_db), _=Depends(require_admin)):
    v = db.query(KitVariant).filter_by(id=variant_id).first()
    if not v:
        raise HTTPException(404, "Kit variant not found")
    c = KitComponent(kit_variant_id=variant_id, **data.model_dump())
    db.add(c)
    db.commit()
    return _serialize_kit_component(c)


@router.patch("/components/{component_id}")
def update_kit_component(component_id: int, data: KitComponentUpdate,
                         db: Session = Depends(get_db), _=Depends(require_admin)):
    c = db.query(KitComponent).filter_by(id=component_id).first()
    if not c:
        raise HTTPException(404, "Kit component not found")
    for k, val in data.model_dump(exclude_none=True).items():
        setattr(c, k, val)
    db.commit()
    return _serialize_kit_component(c)


@router.delete("/components/{component_id}")
def delete_kit_component(component_id: int,
                         db: Session = Depends(get_db), _=Depends(require_admin)):
    c = db.query(KitComponent).filter_by(id=component_id).first()
    if not c:
        raise HTTPException(404, "Kit component not found")
    db.delete(c)
    db.commit()
    return {"ok": True}


# ── LineItemComponent (bid snapshot) Routes ───────────────────

@router.get("/line-items/{line_item_id}/components")
def list_line_item_components(line_item_id: int,
                              db: Session = Depends(get_db), _=Depends(get_current_user)):
    components = (db.query(LineItemComponent)
                    .filter_by(line_item_id=line_item_id)
                    .order_by(LineItemComponent.sort_order)
                    .all())
    return [_serialize_lic(c) for c in components]


@router.patch("/line-item-components/{component_id}")
def update_line_item_component(component_id: int, data: LineItemComponentUpdate,
                               db: Session = Depends(get_db), _=Depends(get_current_user)):
    c = db.query(LineItemComponent).filter_by(id=component_id).first()
    if not c:
        raise HTTPException(404, "Line item component not found")
    for k, val in data.model_dump(exclude_none=True).items():
        setattr(c, k, val)
    db.commit()
    return _serialize_lic(c)


@router.delete("/line-item-components/{component_id}")
def delete_line_item_component(component_id: int,
                               db: Session = Depends(get_db), _=Depends(get_current_user)):
    c = db.query(LineItemComponent).filter_by(id=component_id).first()
    if not c:
        raise HTTPException(404, "Line item component not found")
    db.delete(c)
    db.commit()
    return {"ok": True}
