from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from core.database import get_db
from core.security import get_current_user
from models.models import Builder, Project, User


class BulkDelete(BaseModel):
    ids: list[int]

router = APIRouter()


class BuilderIn(BaseModel):
    code:         str
    name:         str
    contact_name: Optional[str] = None
    office_phone: Optional[str] = None
    cell_phone:   Optional[str] = None
    fax:          Optional[str] = None
    email:        Optional[str] = None
    address:      Optional[str] = None
    city:         Optional[str] = None
    state:        Optional[str] = None
    zip_code:     Optional[str] = None


@router.get("/")
def list_builders(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    builders = db.query(Builder).filter_by(active=True).order_by(Builder.name).all()
    return [
        {
            "id":           b.id,
            "code":         b.code,
            "name":         b.name,
            "contact_name": b.contact_name,
            "office_phone": b.office_phone,
            "cell_phone":   b.cell_phone,
            "email":        b.email,
            "address":      b.address,
            "city":         b.city,
            "state":        b.state,
            "zip_code":     b.zip_code,
        }
        for b in builders
    ]


@router.post("/", status_code=201)
def create_builder(data: BuilderIn, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    if db.query(Builder).filter_by(code=data.code).first():
        raise HTTPException(400, f"Builder code {data.code} already exists")
    b = Builder(**data.model_dump())
    db.add(b)
    db.commit()
    return {"id": b.id, "code": b.code}


@router.patch("/{builder_id}")
def update_builder(builder_id: int, data: BuilderIn, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    b = db.query(Builder).filter_by(id=builder_id).first()
    if not b:
        raise HTTPException(404, "Builder not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(b, k, v)
    db.commit()
    return {"ok": True}


@router.delete("/{builder_id}")
def delete_builder(builder_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    builder = db.query(Builder).filter_by(id=builder_id).first()
    if not builder:
        raise HTTPException(404, "Builder not found")
    project_count = db.query(Project).filter_by(builder_id=builder_id).count()
    if project_count > 0:
        raise HTTPException(400,
            f"Cannot delete — {project_count} project(s) reference this builder. "
            "Delete those projects first.")
    db.delete(builder)
    db.commit()
    return {"ok": True}


@router.post("/bulk-delete")
def bulk_delete_builders(data: BulkDelete, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    builders = db.query(Builder).filter(Builder.id.in_(data.ids)).all()
    skipped = []
    for b in builders:
        count = db.query(Project).filter_by(builder_id=b.id).count()
        if count > 0:
            skipped.append(b.name)
            continue
        db.delete(b)
    db.commit()
    return {"deleted": len(data.ids) - len(skipped), "skipped_with_projects": skipped}
