"""
Kit pricing routes — v2 (2019 Kit Prices structure)

GET  /api/kit/variants              — all variants grouped by category
GET  /api/kit/variants/flat         — flat list (admin)
POST /api/kit/variants              — create variant (admin)
PATCH /api/kit/variants/{id}        — update variant (admin)
DELETE /api/kit/variants/{id}       — delete variant (admin)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from core.database import get_db
from core.security import get_current_user, require_admin
from models.models import KitVariant

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────

class KitVariantIn(BaseModel):
    category_code: str
    category_name: str
    variant_code:  str
    variant_name:  str
    per_kit:       float = 0
    per_foot:      float = 0
    sort_order:    int   = 10
    active:        bool  = True


def _serialize(v: KitVariant) -> dict:
    return {
        "id":            v.id,
        "category_code": v.category_code,
        "category_name": v.category_name,
        "variant_code":  v.variant_code,
        "variant_name":  v.variant_name,
        "per_kit":       float(v.per_kit),
        "per_foot":      float(v.per_foot),
        "sort_order":    v.sort_order,
    }


# ── Routes ────────────────────────────────────────────────────

@router.get("/variants")
def list_variants(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Returns variants grouped by category, sorted by category sort then variant sort."""
    rows = (db.query(KitVariant)
              .filter_by(active=True)
              .order_by(KitVariant.category_code, KitVariant.sort_order)
              .all())

    # Build ordered category list preserving first-seen order of category_code
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
