from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from core.database import get_db
from core.security import get_current_user
from models.models import Plan, Project, Builder, EquipmentSystem, EquipmentManufacturer, User, LineItem, System, HouseType

router = APIRouter()


@router.get("/")
def search(
    q: str = Query(..., min_length=1, max_length=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    like = f"%{q}%"
    results = []

    ops_roles = {"admin", "account_manager", "account_executive"}

    # ── Plans ─────────────────────────────────────────────────────────────────
    if current_user.role in ops_roles:
        pq = (
            db.query(Plan)
            .join(Plan.project)
            .join(Project.builder)
            .filter(
                Plan.plan_number.ilike(like)
                | Plan.house_type.ilike(like)
                | Project.name.ilike(like)
                | Builder.name.ilike(like)
            )
        )
        if current_user.role == "account_manager":
            pq = pq.filter(Plan.estimator_initials == current_user.initials)
        for p in pq.order_by(Plan.created_at.desc()).limit(6).all():
            results.append({
                "type":  "plan",
                "id":    p.id,
                "label": f"{p.plan_number}",
                "sub":   f"{p.project.name} · {p.project.builder.name}",
                "url":   f"/plans/{p.id}",
            })

    # ── Projects ──────────────────────────────────────────────────────────────
    if current_user.role in ops_roles:
        for p in (
            db.query(Project)
            .filter(
                Project.active == True,  # noqa: E712
                Project.name.ilike(like) | Project.code.ilike(like),
            )
            .order_by(Project.name)
            .limit(5)
            .all()
        ):
            results.append({
                "type":  "project",
                "id":    p.id,
                "label": p.name,
                "sub":   p.code,
                "url":   f"/projects?q={p.name}",
            })

    # ── Builders ──────────────────────────────────────────────────────────────
    if current_user.role in ops_roles:
        for b in (
            db.query(Builder)
            .filter(
                Builder.active == True,  # noqa: E712
                Builder.name.ilike(like)
                | Builder.code.ilike(like)
                | Builder.contact_name.ilike(like),
            )
            .order_by(Builder.name)
            .limit(5)
            .all()
        ):
            results.append({
                "type":  "builder",
                "id":    b.id,
                "label": b.name,
                "sub":   b.contact_name or b.code,
                "url":   f"/builders?q={b.name}",
            })

    # ── Line items ────────────────────────────────────────────────────────────
    if current_user.role in ops_roles:
        liq = (
            db.query(LineItem)
            .join(LineItem.system)
            .join(System.house_type)
            .join(HouseType.plan)
            .join(Plan.project)
            .join(Project.builder)
            .filter(LineItem.description.ilike(like))
        )
        if current_user.role == "account_manager":
            liq = liq.filter(Plan.estimator_initials == current_user.initials)
        seen_plans = set()
        for li in liq.order_by(Plan.created_at.desc()).limit(20).all():
            plan_obj = li.system.house_type.plan
            if plan_obj.id in seen_plans:
                continue
            seen_plans.add(plan_obj.id)
            results.append({
                "type":  "plan",
                "id":    plan_obj.id,
                "label": plan_obj.plan_number,
                "sub":   f"{li.description} · {plan_obj.project.name}",
                "url":   f"/plans/{plan_obj.id}",
            })
            if len(seen_plans) >= 4:
                break

    # ── Equipment ─────────────────────────────────────────────────────────────
    if current_user.role in ops_roles:
        for e in (
            db.query(EquipmentSystem)
            .join(EquipmentSystem.manufacturer)
            .filter(
                EquipmentSystem.system_code.ilike(like)
                | EquipmentSystem.description.ilike(like)
                | EquipmentManufacturer.name.ilike(like),
            )
            .order_by(EquipmentSystem.system_code)
            .limit(5)
            .all()
        ):
            results.append({
                "type":  "equipment",
                "id":    e.id,
                "label": e.system_code,
                "sub":   e.manufacturer.name if e.manufacturer else "",
                "url":   f"/equipment?q={e.system_code}",
            })

    return results


@router.get("/line-items")
def line_item_suggestions(
    q: str = Query(..., min_length=2, max_length=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return aggregated pricing suggestions from historical line items."""
    like = f"%{q}%"
    rows = (
        db.query(
            LineItem.description,
            func.avg(LineItem.unit_price).label("avg_price"),
            func.count(LineItem.id).label("use_count"),
        )
        .filter(LineItem.description.ilike(like), LineItem.unit_price > 0)
        .group_by(LineItem.description)
        .order_by(func.count(LineItem.id).desc())
        .limit(6)
        .all()
    )
    return [
        {"description": r.description, "avg_price": round(float(r.avg_price), 2), "count": r.use_count}
        for r in rows
    ]
