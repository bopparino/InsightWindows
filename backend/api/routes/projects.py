from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import Optional
from core.database import get_db
from core.security import get_current_user
from models.models import Project, Builder, Plan, User


class BulkDelete(BaseModel):
    ids: list[int]

router = APIRouter()


class ProjectIn(BaseModel):
    code:       str
    name:       str
    builder_id: int
    county_id:  Optional[int] = None


@router.get("/")
def list_projects(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    projects = db.query(Project).options(
        joinedload(Project.builder)
    ).filter_by(active=True).order_by(Project.name).all()
    return [
        {
            "id":           p.id,
            "code":         p.code,
            "name":         p.name,
            "builder_id":   p.builder_id,
            "builder_name": p.builder.name,
            "builder_code": p.builder.code,
        }
        for p in projects
    ]


@router.post("/", status_code=201)
def create_project(data: ProjectIn, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    if not db.query(Builder).filter_by(id=data.builder_id).first():
        raise HTTPException(404, "Builder not found")
    if db.query(Project).filter_by(code=data.code).first():
        raise HTTPException(400, f"Project code {data.code} already exists")
    p = Project(**data.model_dump())
    db.add(p)
    db.commit()
    return {"id": p.id, "code": p.code}


@router.post("/bulk-delete")
def bulk_delete_projects(data: BulkDelete, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    project_list = db.query(Project).filter(Project.id.in_(data.ids)).all()
    skipped = []
    for p in project_list:
        count = db.query(Plan).filter_by(project_id=p.id).count()
        if count > 0:
            skipped.append(p.name)
            continue
        db.delete(p)
    db.commit()
    return {"deleted": len(data.ids) - len(skipped), "skipped_with_plans": skipped}


@router.patch("/{project_id}")
def update_project(project_id: int, data: ProjectIn, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    project = db.query(Project).filter_by(id=project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(project, k, v)
    db.commit()
    return {"ok": True}


@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    project = db.query(Project).filter_by(id=project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")
    plan_count = db.query(Plan).filter_by(project_id=project_id).count()
    if plan_count > 0:
        raise HTTPException(400,
            f"Cannot delete — {plan_count} plan(s) reference this project. "
            "Delete or reassign those plans first.")
    db.delete(project)
    db.commit()
    return {"ok": True}
