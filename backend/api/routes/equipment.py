from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from core.database import get_db
from core.security import get_current_user
from models.models import EquipmentManufacturer, EquipmentSystem, EquipmentComponent, User

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────

class ManufacturerIn(BaseModel):
    code: str
    name: str

class SystemIn(BaseModel):
    manufacturer_id: int
    system_code:     str
    description:     str
    component_cost:  float
    bid_price:       float
    effective_date:  Optional[str] = None  # ISO date string, defaults to today

class BulkRetireIn(BaseModel):
    ids: List[int]


# ── Read ──────────────────────────────────────────────────────

@router.get("/manufacturers")
def list_manufacturers(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    mfrs = db.query(EquipmentManufacturer).order_by(EquipmentManufacturer.name).all()
    return [{"id": m.id, "code": m.code, "name": m.name} for m in mfrs]


@router.get("/systems")
def list_systems(
    manufacturer_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(EquipmentSystem).options(
        joinedload(EquipmentSystem.manufacturer),
        joinedload(EquipmentSystem.components),
    ).filter(EquipmentSystem.retired_date.is_(None))

    if manufacturer_id:
        q = q.filter_by(manufacturer_id=manufacturer_id)
    if search:
        q = q.filter(
            EquipmentSystem.system_code.ilike(f"%{search}%") |
            EquipmentSystem.description.ilike(f"%{search}%")
        )

    systems = q.order_by(EquipmentSystem.system_code).all()
    return [
        {
            "id":             s.id,
            "system_code":    s.system_code,
            "description":    s.description,
            "component_cost": float(s.component_cost),
            "bid_price":      float(s.bid_price),
            "manufacturer":   s.manufacturer.name if s.manufacturer else None,
            "manufacturer_id": s.manufacturer_id,
            "components": [
                {
                    "component_type": c.component_type,
                    "model_number":   c.model_number,
                    "cost":           float(c.cost) if c.cost is not None else None,
                    "sort_order":     c.sort_order,
                }
                for c in sorted(s.components, key=lambda c: c.sort_order)
            ],
        }
        for s in systems
    ]


# ── Create ────────────────────────────────────────────────────

@router.post("/manufacturers", status_code=201)
def create_manufacturer(
    data: ManufacturerIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    code = data.code.upper().strip()
    if db.query(EquipmentManufacturer).filter_by(code=code).first():
        raise HTTPException(status_code=400, detail=f"Manufacturer code '{code}' already exists")
    mfr = EquipmentManufacturer(code=code, name=data.name.strip())
    db.add(mfr)
    db.commit()
    return {"id": mfr.id, "code": mfr.code, "name": mfr.name}


@router.post("/systems", status_code=201)
def create_system(
    data: SystemIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    mfr = db.query(EquipmentManufacturer).filter_by(id=data.manufacturer_id).first()
    if not mfr:
        raise HTTPException(status_code=404, detail="Manufacturer not found")
    eff = date.fromisoformat(data.effective_date) if data.effective_date else date.today()
    s = EquipmentSystem(
        manufacturer_id=data.manufacturer_id,
        system_code=data.system_code.strip().upper(),
        description=data.description.strip(),
        component_cost=data.component_cost,
        bid_price=data.bid_price,
        effective_date=eff,
    )
    db.add(s)
    db.commit()
    return {
        "id":             s.id,
        "system_code":    s.system_code,
        "description":    s.description,
        "component_cost": float(s.component_cost),
        "bid_price":      float(s.bid_price),
        "manufacturer":   mfr.name,
        "manufacturer_id": s.manufacturer_id,
    }


# ── Delete (retire) ───────────────────────────────────────────

@router.post("/systems/bulk-retire")
def bulk_retire_systems(
    data: BulkRetireIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    if not data.ids:
        return {"ok": True, "retired": 0}
    retired = (
        db.query(EquipmentSystem)
        .filter(EquipmentSystem.id.in_(data.ids))
        .filter(EquipmentSystem.retired_date.is_(None))
        .update({"retired_date": date.today()}, synchronize_session=False)
    )
    db.commit()
    return {"ok": True, "retired": retired}


@router.delete("/systems/{system_id}")
def delete_system(
    system_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    s = db.query(EquipmentSystem).filter_by(id=system_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="System not found")
    if s.retired_date:
        raise HTTPException(status_code=400, detail="Already retired")
    s.retired_date = date.today()
    db.commit()
    return {"ok": True}


@router.delete("/manufacturers/{manufacturer_id}")
def delete_manufacturer(
    manufacturer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    mfr = db.query(EquipmentManufacturer).filter_by(id=manufacturer_id).first()
    if not mfr:
        raise HTTPException(status_code=404, detail="Manufacturer not found")
    retired = (
        db.query(EquipmentSystem)
        .filter_by(manufacturer_id=manufacturer_id)
        .filter(EquipmentSystem.retired_date.is_(None))
        .update({"retired_date": date.today()}, synchronize_session=False)
    )
    db.commit()
    return {"ok": True, "retired": retired}
