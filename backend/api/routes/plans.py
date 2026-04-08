from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import re

from core.database import get_db
from core.config import settings
from core.security import get_current_user
from models.models import Plan, Project, Builder, HouseType, System, LineItem, Draw, EventLog, Document, User, PlanComment, PlanTask

router = APIRouter()



# ── Pydantic schemas ──────────────────────────────────────────

class LineItemIn(BaseModel):
    sort_order: str
    pricing_flag: str = "standard"
    description: str
    quantity: float = 1
    unit_price: float = 0
    pwk_price: Optional[float] = None
    draw_stage: Optional[str] = None
    part_number: Optional[str] = None
    notes: Optional[str] = None

class SystemIn(BaseModel):
    system_number: str = "01"
    zone_label: Optional[str] = None
    equipment_system_id: Optional[int] = None
    notes: Optional[str] = None
    line_items: list[LineItemIn] = []

class DrawIn(BaseModel):
    stage: str
    amount: float
    draw_number: int

class BulkStatusUpdate(BaseModel):
    ids: list[int]
    status: str

class BulkDelete(BaseModel):
    ids: list[int]

class HouseTypeIn(BaseModel):
    house_number: str = "01"
    name: str
    bid_hours: Optional[float] = None
    pwk_sheet_metal: Optional[float] = None
    notes: Optional[str] = None
    systems: list[SystemIn] = []
    draws: list[DrawIn] = []

class PlanCreate(BaseModel):
    project_id: int
    house_type: Optional[str] = None
    number_of_zones: int = 1
    notes: Optional[str] = None
    house_types: list[HouseTypeIn] = []

class PlanUpdate(BaseModel):
    status:      Optional[str]  = None
    house_type:  Optional[str]  = None
    notes:       Optional[str]  = None
    is_template: Optional[bool] = None


# ── Helpers ───────────────────────────────────────────────────

def generate_plan_number(db: Session, initials: str) -> str:
    """Generate next plan number: {INITIALS}{SEQ}{MONTH}{YEAR}"""
    initials = initials.upper()
    now = datetime.now()
    month_code = f"{now.month:02d}"
    year_code  = str(now.year)[-2:]
    prefix     = f"{initials}%{month_code}{year_code}"

    existing = db.query(Plan).filter(
        Plan.plan_number.like(prefix)
    ).count()
    seq = f"{(existing + 1):03d}"
    return f"{initials}{seq}{month_code}{year_code}"


def log_event(db: Session, plan_id: int, event_type: str, description: str, username: str = "system"):
    db.add(EventLog(
        username=username,
        plan_id=plan_id,
        event_type=event_type,
        description=description,
    ))


# ── Routes ────────────────────────────────────────────────────

@router.get("/")
def list_plans(status: Optional[str] = None, db: Session = Depends(get_db),
               current_user: User = Depends(get_current_user)):
    # Compute total_bid per plan in SQL — avoids loading all line items into memory
    total_subq = (
        select(
            HouseType.plan_id,
            func.coalesce(
                func.sum(LineItem.quantity * LineItem.unit_price), 0
            ).label("total_bid"),
        )
        .join(System, System.house_type_id == HouseType.id)
        .join(LineItem, LineItem.system_id == System.id)
        .group_by(HouseType.plan_id)
        .subquery()
    )

    q = (
        db.query(Plan, func.coalesce(total_subq.c.total_bid, 0).label("total_bid"))
        .outerjoin(total_subq, total_subq.c.plan_id == Plan.id)
        .join(Plan.project)
        .join(Project.builder)
        .options(
            joinedload(Plan.project).joinedload(Project.builder),
        )
    )
    if status:
        q = q.filter(Plan.status == status)
    # Account managers only see their own plans
    if current_user.role == "account_manager":
        q = q.filter(Plan.estimator_initials == current_user.initials)
    rows = q.order_by(Plan.created_at.desc()).all()

    return [
        {
            "id":              p.id,
            "plan_number":     p.plan_number,
            "status":          p.status,
            "house_type":      p.house_type,
            "project_code":    p.project.code,
            "project_name":    p.project.name,
            "builder_name":    p.project.builder.name,
            "estimator_name":  p.estimator_name,
            "number_of_zones": p.number_of_zones,
            "created_at":      p.created_at,
            "contracted_at":   p.contracted_at,
            "total_bid":       float(total_bid),
        }
        for p, total_bid in rows
    ]


@router.get("/templates")
def list_templates(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Return all plans marked as templates."""
    rows = (
        db.query(Plan)
        .join(Plan.project).join(Project.builder)
        .options(joinedload(Plan.project).joinedload(Project.builder))
        .filter(Plan.is_template == True)  # noqa: E712
        .order_by(Plan.plan_number)
        .all()
    )
    return [
        {
            "id":          p.id,
            "plan_number": p.plan_number,
            "house_type":  p.house_type,
            "project_name": p.project.name,
            "builder_name": p.project.builder.name,
        }
        for p in rows
    ]


@router.get("/export-csv")
def export_plans_csv(status: Optional[str] = None, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    """Download the plans list as a CSV file."""
    import csv, io
    total_subq = (
        select(
            HouseType.plan_id,
            func.coalesce(func.sum(LineItem.quantity * LineItem.unit_price), 0).label("total_bid"),
        )
        .join(System, System.house_type_id == HouseType.id)
        .join(LineItem, LineItem.system_id == System.id)
        .group_by(HouseType.plan_id)
        .subquery()
    )
    q = (
        db.query(Plan, func.coalesce(total_subq.c.total_bid, 0).label("total_bid"))
        .outerjoin(total_subq, total_subq.c.plan_id == Plan.id)
        .join(Plan.project).join(Project.builder)
        .options(joinedload(Plan.project).joinedload(Project.builder))
    )
    if status:
        q = q.filter(Plan.status == status)
    if current_user.role == "account_manager":
        q = q.filter(Plan.estimator_initials == current_user.initials)
    rows = q.order_by(Plan.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Plan Number", "Status", "Project Code", "Project Name",
        "Builder", "House Type", "Zones", "Total Bid",
        "Estimator", "Created", "Contracted",
    ])
    for p, total_bid in rows:
        writer.writerow([
            p.plan_number, p.status,
            p.project.code, p.project.name, p.project.builder.name,
            p.house_type or "", p.number_of_zones,
            f"{float(total_bid):.2f}", p.estimator_name,
            p.created_at.strftime("%Y-%m-%d") if p.created_at else "",
            p.contracted_at.strftime("%Y-%m-%d") if p.contracted_at else "",
        ])

    filename = f"plans{'_' + status if status else ''}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/performance")
def get_performance(
    date_from: Optional[str] = None,
    date_to:   Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Per-account-manager performance summary + monthly contracted revenue series.
    Pulls from real User records (excludes admin role).
    account_manager: only their own row.
    account_executive / admin: all account managers.
    """
    # --- Eligible users: active, non-admin ---
    user_q = db.query(User).filter(
        User.active == True,
        User.role != "admin",
    )
    if current_user.role == "account_manager":
        user_q = user_q.filter(User.initials == current_user.initials)
    eligible_users = user_q.order_by(User.full_name).all()

    # --- total_bid subquery ---
    total_subq = (
        select(
            HouseType.plan_id,
            func.coalesce(func.sum(LineItem.quantity * LineItem.unit_price), 0).label("total_bid"),
        )
        .join(System, System.house_type_id == HouseType.id)
        .join(LineItem, LineItem.system_id == System.id)
        .group_by(HouseType.plan_id)
        .subquery()
    )

    # --- Plan rows filtered by date ---
    eligible_inits = [u.initials for u in eligible_users]
    q = (
        db.query(
            Plan.estimator_initials,
            Plan.status,
            Plan.created_at,
            Plan.contracted_at,
            func.coalesce(total_subq.c.total_bid, 0).label("total_bid"),
        )
        .outerjoin(total_subq, total_subq.c.plan_id == Plan.id)
        .filter(Plan.estimator_initials.in_(eligible_inits))
    )
    if date_from:
        q = q.filter(Plan.created_at >= date_from)
    if date_to:
        q = q.filter(Plan.created_at <= date_to)
    rows = q.all()

    # --- Aggregate plan rows per initials ---
    STATUSES = ["draft", "proposed", "contracted", "complete", "lost"]
    agg = {}
    for est_init, status, created_at, contracted_at, total_bid in rows:
        if est_init not in agg:
            agg[est_init] = {
                "by_status":   {s: {"count": 0, "total": 0.0} for s in STATUSES},
                "last_activity": None,
            }
        e = agg[est_init]
        if status in e["by_status"]:
            e["by_status"][status]["count"] += 1
            e["by_status"][status]["total"] += float(total_bid)
        activity = contracted_at or created_at
        if activity and (e["last_activity"] is None or activity > e["last_activity"]):
            e["last_activity"] = activity

    # --- Build summary from users (includes users with 0 plans) ---
    summary = []
    for u in eligible_users:
        e  = agg.get(u.initials, {"by_status": {s: {"count": 0, "total": 0.0} for s in STATUSES}, "last_activity": None})
        bs = e["by_status"]
        won   = bs["contracted"]["count"] + bs["complete"]["count"]
        lost  = bs["lost"]["count"]
        denom = won + lost
        summary.append({
            "estimator_name":     u.full_name,
            "estimator_initials": u.initials,
            "by_status":          bs,
            "total_plans":        sum(v["count"] for v in bs.values()),
            "total_bid":          sum(v["total"] for v in bs.values()),
            "contracted_revenue": bs["contracted"]["total"] + bs["complete"]["total"],
            "pipeline":           bs["proposed"]["total"],
            "win_rate":           round(won / denom, 4) if denom else None,
            "last_activity":      e["last_activity"].isoformat() if e["last_activity"] else None,
        })

    summary.sort(key=lambda x: x["contracted_revenue"], reverse=True)

    # --- Monthly contracted revenue series ---
    monthly_q = (
        db.query(
            Plan.estimator_initials,
            func.extract("year",  Plan.contracted_at).label("yr"),
            func.extract("month", Plan.contracted_at).label("mo"),
            func.coalesce(func.sum(total_subq.c.total_bid), 0).label("total_bid"),
        )
        .outerjoin(total_subq, total_subq.c.plan_id == Plan.id)
        .filter(Plan.status.in_(["contracted", "complete"]))
        .filter(Plan.contracted_at.isnot(None))
        .filter(Plan.estimator_initials.in_(eligible_inits))
        .group_by(Plan.estimator_initials,
                  func.extract("year", Plan.contracted_at),
                  func.extract("month", Plan.contracted_at))
    )
    if date_from:
        monthly_q = monthly_q.filter(Plan.contracted_at >= date_from)
    if date_to:
        monthly_q = monthly_q.filter(Plan.contracted_at <= date_to)

    # Map initials → full name for monthly series
    init_to_name = {u.initials: u.full_name for u in eligible_users}
    monthly = [
        {
            "estimator_initials": init,
            "estimator_name":     init_to_name.get(init, init),
            "year":  int(yr),
            "month": int(mo),
            "total_bid": float(total),
        }
        for init, yr, mo, total in monthly_q.all()
    ]

    # --- Builder breakdown ---
    builder_rows = (
        db.query(
            Builder.name.label("builder_name"),
            Plan.status,
            func.coalesce(total_subq.c.total_bid, 0).label("total_bid"),
        )
        .join(Plan.project)
        .join(Project.builder)
        .outerjoin(total_subq, total_subq.c.plan_id == Plan.id)
        .filter(Plan.estimator_initials.in_(eligible_inits))
        .filter(Plan.is_template == False)
    )
    if date_from:
        builder_rows = builder_rows.filter(Plan.created_at >= date_from)
    if date_to:
        builder_rows = builder_rows.filter(Plan.created_at <= date_to)

    builder_agg = {}
    for bname, status, total_bid in builder_rows.all():
        if bname not in builder_agg:
            builder_agg[bname] = {s: {"count": 0, "total": 0.0} for s in STATUSES}
        if status in builder_agg[bname]:
            builder_agg[bname][status]["count"] += 1
            builder_agg[bname][status]["total"] += float(total_bid)

    by_builder = []
    for bname, bs in builder_agg.items():
        won   = bs["contracted"]["count"] + bs["complete"]["count"]
        lost  = bs["lost"]["count"]
        denom = won + lost
        by_builder.append({
            "builder_name":      bname,
            "total_plans":       sum(v["count"] for v in bs.values()),
            "contracted_revenue": bs["contracted"]["total"] + bs["complete"]["total"],
            "pipeline":          bs["proposed"]["total"],
            "win_rate":          round(won / denom, 4) if denom else None,
            "by_status":         bs,
        })
    by_builder.sort(key=lambda x: x["contracted_revenue"], reverse=True)

    # --- House type breakdown ---
    ht_rows = (
        db.query(
            Plan.house_type,
            Plan.status,
            func.coalesce(total_subq.c.total_bid, 0).label("total_bid"),
        )
        .outerjoin(total_subq, total_subq.c.plan_id == Plan.id)
        .filter(Plan.estimator_initials.in_(eligible_inits))
        .filter(Plan.house_type.isnot(None), Plan.house_type != "")
        .filter(Plan.is_template == False)
    )
    if date_from:
        ht_rows = ht_rows.filter(Plan.created_at >= date_from)
    if date_to:
        ht_rows = ht_rows.filter(Plan.created_at <= date_to)

    ht_agg = {}
    for ht, status, total_bid in ht_rows.all():
        if ht not in ht_agg:
            ht_agg[ht] = {s: {"count": 0, "total": 0.0} for s in STATUSES}
        if status in ht_agg[ht]:
            ht_agg[ht][status]["count"] += 1
            ht_agg[ht][status]["total"] += float(total_bid)

    by_house_type = []
    for ht, bs in ht_agg.items():
        won        = bs["contracted"]["count"] + bs["complete"]["count"]
        lost       = bs["lost"]["count"]
        denom      = won + lost
        total      = sum(v["count"] for v in bs.values())
        total_val  = sum(v["total"] for v in bs.values())
        by_house_type.append({
            "house_type":        ht,
            "total_plans":       total,
            "contracted_revenue": bs["contracted"]["total"] + bs["complete"]["total"],
            "pipeline":          bs["proposed"]["total"],
            "avg_bid":           round(total_val / total, 2) if total else 0,
            "win_rate":          round(won / denom, 4) if denom else None,
        })
    by_house_type.sort(key=lambda x: x["total_plans"], reverse=True)

    return {"summary": summary, "monthly": monthly, "by_builder": by_builder, "by_house_type": by_house_type}


@router.post("/", status_code=201)
def create_plan(data: PlanCreate, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter_by(id=data.project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")

    # Retry up to 3 times in case of a concurrent duplicate plan number
    for attempt in range(3):
        plan_number = generate_plan_number(db, current_user.initials)
        plan = Plan(
            plan_number=plan_number,
            estimator_name=current_user.full_name,
            estimator_initials=current_user.initials,
            project_id=data.project_id,
            house_type=data.house_type,
            number_of_zones=data.number_of_zones,
            notes=data.notes,
            status="draft",
        )
        db.add(plan)
        try:
            db.flush()
            break
        except IntegrityError:
            db.rollback()
            if attempt == 2:
                raise HTTPException(500, "Could not generate a unique plan number, please try again")
    else:
        raise HTTPException(500, "Could not generate a unique plan number, please try again")

    for ht_data in data.house_types:
        ht = HouseType(
            plan_id=plan.id,
            house_number=ht_data.house_number,
            name=ht_data.name,
            bid_hours=ht_data.bid_hours,
            pwk_sheet_metal=ht_data.pwk_sheet_metal,
            notes=ht_data.notes,
        )
        db.add(ht)
        db.flush()

        for sys_data in ht_data.systems:
            system = System(
                house_type_id=ht.id,
                system_number=sys_data.system_number,
                zone_label=sys_data.zone_label,
                equipment_system_id=sys_data.equipment_system_id,
                notes=sys_data.notes,
            )
            db.add(system)
            db.flush()

            for li_data in sys_data.line_items:
                db.add(LineItem(
                    system_id=system.id,
                    sort_order=li_data.sort_order,
                    pricing_flag=li_data.pricing_flag,
                    description=li_data.description,
                    quantity=li_data.quantity,
                    unit_price=li_data.unit_price,
                    pwk_price=li_data.pwk_price,
                    draw_stage=li_data.draw_stage,
                    part_number=li_data.part_number,
                    notes=li_data.notes,
                ))

        for draw_data in ht_data.draws:
            db.add(Draw(
                house_type_id=ht.id,
                stage=draw_data.stage,
                amount=draw_data.amount,
                draw_number=draw_data.draw_number,
            ))

    log_event(db, plan.id, "plan_created", f"Plan {plan_number} created", current_user.username)
    db.commit()
    return {"id": plan.id, "plan_number": plan_number}


@router.post("/bulk-status")
def bulk_update_status(data: BulkStatusUpdate, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    VALID_TRANSITIONS = {
        "draft":      {"proposed", "lost"},
        "proposed":   {"contracted", "lost", "draft"},
        "contracted": {"complete"},
        "complete":   set(),
        "lost":       {"draft"},
    }
    plans_list = db.query(Plan).filter(Plan.id.in_(data.ids)).all()
    errors, updated = [], 0
    for plan in plans_list:
        if data.status not in VALID_TRANSITIONS.get(plan.status, set()):
            errors.append(f"{plan.plan_number}: cannot move from '{plan.status}' to '{data.status}'")
            continue
        plan.status = data.status
        if data.status == "contracted":
            plan.contracted_at = datetime.now()
        updated += 1
    db.commit()
    return {"updated": updated, "errors": errors}


@router.post("/bulk-delete")
def bulk_delete_plans(data: BulkDelete, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(403, "Only admins can bulk delete plans")
    plans_list = db.query(Plan).options(
        joinedload(Plan.house_types).joinedload(HouseType.systems).joinedload(System.line_items),
        joinedload(Plan.house_types).joinedload(HouseType.draws),
        joinedload(Plan.documents),
    ).filter(Plan.id.in_(data.ids)).all()
    skipped = []
    for plan in plans_list:
        if plan.status == "contracted":
            skipped.append(plan.plan_number)
            continue
        for ht in plan.house_types:
            for sys in ht.systems:
                for li in sys.line_items:
                    db.delete(li)
                db.delete(sys)
            for draw in ht.draws:
                db.delete(draw)
            db.delete(ht)
        for doc in plan.documents:
            db.delete(doc)
        db.query(EventLog).filter_by(plan_id=plan.id).delete()
        db.delete(plan)
    db.commit()
    return {"deleted": len(data.ids) - len(skipped), "skipped_contracted": skipped}


@router.get("/{plan_id}")
def get_plan(plan_id: int, db: Session = Depends(get_db),
             current_user: User = Depends(get_current_user)):
    plan = db.query(Plan).options(
        joinedload(Plan.project).joinedload(Project.builder),
        joinedload(Plan.house_types).joinedload(HouseType.systems).joinedload(System.line_items),
        joinedload(Plan.house_types).joinedload(HouseType.draws),
        joinedload(Plan.house_types).joinedload(HouseType.systems).joinedload(System.equipment_system),
    ).filter_by(id=plan_id).first()

    if not plan:
        raise HTTPException(404, "Plan not found")

    return {
        "id": plan.id,
        "plan_number": plan.plan_number,
        "status": plan.status,
        "house_type": plan.house_type,
        "number_of_zones": plan.number_of_zones,
        "notes": plan.notes,
        "is_template": plan.is_template,
        "estimator_name": plan.estimator_name,
        "created_at": plan.created_at,
        "contracted_at": plan.contracted_at,
        "project": {
            "id": plan.project.id,
            "code": plan.project.code,
            "name": plan.project.name,
            "builder": {
                "id": plan.project.builder.id,
                "name": plan.project.builder.name,
                "contact_name": plan.project.builder.contact_name,
            },
        },
        "house_types": [
            {
                "id": ht.id,
                "house_number": ht.house_number,
                "name": ht.name,
                "bid_hours": float(ht.bid_hours or 0),
                "pwk_sheet_metal": float(ht.pwk_sheet_metal or 0),
                "total_bid": float(sum(
                    li.quantity * li.unit_price
                    for s in ht.systems for li in s.line_items
                )),
                "notes": ht.notes,
                "draws": [
                    {"stage": d.stage, "amount": float(d.amount), "draw_number": d.draw_number}
                    for d in sorted(ht.draws, key=lambda x: x.draw_number)
                ],
                "systems": [
                    {
                        "id": s.id,
                        "system_number": s.system_number,
                        "zone_label": s.zone_label,
                        "equipment_system": {
                            "system_code": s.equipment_system.system_code,
                            "description": s.equipment_system.description,
                            "bid_price": float(s.equipment_system.bid_price),
                        } if s.equipment_system else None,
                        "line_items": [
                            {
                                "id": li.id,
                                "sort_order": li.sort_order,
                                "pricing_flag": li.pricing_flag,
                                "description": li.description,
                                "quantity": float(li.quantity),
                                "unit_price": float(li.unit_price),
                                "extended_price": float(li.quantity * li.unit_price),
                                "pwk_price": float(li.pwk_price or 0),
                                "draw_stage": li.draw_stage,
                                "part_number": li.part_number,
                            }
                            for li in sorted(s.line_items, key=lambda x: x.sort_order)
                        ],
                    }
                    for s in sorted(ht.systems, key=lambda x: x.system_number)
                ],
            }
            for ht in plan.house_types
        ],
    }


@router.patch("/{plan_id}")
def update_plan(plan_id: int, data: PlanUpdate, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    plan = db.query(Plan).filter_by(id=plan_id).first()
    if not plan:
        raise HTTPException(404, "Plan not found")

    VALID_TRANSITIONS = {
        "draft":      {"proposed", "lost"},
        "proposed":   {"contracted", "lost", "draft"},
        "contracted": {"complete"},
        "complete":   set(),
        "lost":       {"draft"},
    }
    if data.status:
        allowed = VALID_TRANSITIONS.get(plan.status, set())
        if data.status not in allowed:
            raise HTTPException(400, f"Cannot move plan from '{plan.status}' to '{data.status}'")
        plan.status = data.status
        if data.status == "contracted":
            plan.contracted_at = datetime.now()
            log_event(db, plan.id, "plan_contracted", f"Plan {plan.plan_number} contracted")
        elif data.status == "lost":
            log_event(db, plan.id, "plan_lost", f"Plan {plan.plan_number} marked as lost/declined")
    if data.house_type is not None:
        plan.house_type = data.house_type
    if data.notes is not None:
        plan.notes = data.notes
    if data.is_template is not None:
        plan.is_template = data.is_template

    db.commit()
    return {"ok": True}


@router.get("/{plan_id}/emails")
def get_plan_emails(plan_id: int, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    import json
    events = (
        db.query(EventLog)
        .filter(EventLog.plan_id == plan_id, EventLog.event_type == "email_sent")
        .order_by(EventLog.event_at.desc())
        .all()
    )
    result = []
    for e in events:
        try:
            data = json.loads(e.description)
        except Exception:
            data = {}
        result.append({
            "id":       e.id,
            "sent_at":  e.event_at.isoformat() if e.event_at else None,
            "sent_by":  e.username,
            "to":       data.get("to", ""),
            "subject":  data.get("subject", ""),
            "filename": data.get("filename", ""),
        })
    return result


@router.get("/{plan_id}/activity")
def get_plan_activity(plan_id: int, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    events = (
        db.query(EventLog)
        .filter(EventLog.plan_id == plan_id)
        .order_by(EventLog.event_at.desc())
        .all()
    )
    return [
        {
            "id":          e.id,
            "event_at":    e.event_at.isoformat() if e.event_at else None,
            "username":    e.username,
            "event_type":  e.event_type,
            "description": e.description,
        }
        for e in events
    ]


@router.delete("/{plan_id}")
def delete_plan(plan_id: int, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    if current_user.role not in ("admin",):
        raise HTTPException(403, "Only admins can delete plans")
    plan = db.query(Plan).options(
        joinedload(Plan.house_types).joinedload(HouseType.systems).joinedload(System.line_items),
        joinedload(Plan.house_types).joinedload(HouseType.draws),
        joinedload(Plan.documents),
    ).filter_by(id=plan_id).first()
    if not plan:
        raise HTTPException(404, "Plan not found")
    if plan.status == "contracted":
        raise HTTPException(400, "Cannot delete a contracted plan")
    for ht in plan.house_types:
        for sys in ht.systems:
            for li in sys.line_items:
                db.delete(li)
            db.delete(sys)
        for draw in ht.draws:
            db.delete(draw)
        db.delete(ht)
    for doc in plan.documents:
        db.delete(doc)
    # Delete event log entries referencing this plan
    db.query(EventLog).filter_by(plan_id=plan_id).delete()
    db.delete(plan)
    db.commit()
    return {"ok": True}




@router.post("/{plan_id}/house-types/{house_type_id}/duplicate", status_code=201)
def duplicate_house_type(plan_id: int, house_type_id: int, db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_user)):
    """
    Deep-copies a house type with all its systems and line items.
    Auto-increments the house number (01 -> 02 -> 03 etc).
    """
    # Load source with all children
    source = db.query(HouseType).options(
        joinedload(HouseType.systems).joinedload(System.line_items),
        joinedload(HouseType.draws),
    ).filter_by(id=house_type_id, plan_id=plan_id).first()

    if not source:
        raise HTTPException(404, "House type not found")

    # Find next available house number for this plan
    existing_numbers = [
        int(ht.house_number) for ht in
        db.query(HouseType).filter_by(plan_id=plan_id).all()
        if ht.house_number.isdigit()
    ]
    next_number = f"{(max(existing_numbers) + 1):02d}" if existing_numbers else "02"

    # Create the copy
    new_ht = HouseType(
        plan_id=plan_id,
        house_number=next_number,
        name=source.name,
        bid_hours=source.bid_hours,
        pwk_sheet_metal=source.pwk_sheet_metal,
        total_bid=source.total_bid,
        notes=source.notes,
    )
    db.add(new_ht)
    db.flush()

    # Copy systems + line items
    for sys in source.systems:
        new_sys = System(
            house_type_id=new_ht.id,
            system_number=sys.system_number,
            zone_label=sys.zone_label,
            equipment_system_id=sys.equipment_system_id,
            notes=sys.notes,
        )
        db.add(new_sys)
        db.flush()
        for li in sys.line_items:
            db.add(LineItem(
                system_id=new_sys.id,
                sort_order=li.sort_order,
                pricing_flag=li.pricing_flag,
                description=li.description,
                quantity=li.quantity,
                unit_price=li.unit_price,
                pwk_price=li.pwk_price,
                draw_stage=li.draw_stage,
                part_number=li.part_number,
                notes=li.notes,
            ))

    # Copy draws
    for draw in source.draws:
        db.add(Draw(
            house_type_id=new_ht.id,
            stage=draw.stage,
            amount=draw.amount,
            draw_number=draw.draw_number,
        ))

    plan = db.query(Plan).filter_by(id=plan_id).first()
    log_event(db, plan_id, "house_type_duplicated",
        f"House type '{source.name}' duplicated to #{next_number} on {plan.plan_number}")
    db.commit()
    return {"id": new_ht.id, "house_number": next_number}


# ── House type + line item editing ───────────────────────────

class HouseTypeCreate(BaseModel):
    name: str
    house_number: str = "01"
    bid_hours: Optional[float] = None
    pwk_sheet_metal: Optional[float] = None
    notes: Optional[str] = None

class SystemCreate(BaseModel):
    system_number: str = "01"
    zone_label: Optional[str] = None
    equipment_system_id: Optional[int] = None

class LineItemCreate(BaseModel):
    sort_order: str
    description: str
    pricing_flag: str = "standard"
    quantity: float = 1
    unit_price: float = 0
    pwk_price: Optional[float] = None
    draw_stage: Optional[str] = None
    part_number: Optional[str] = None
    notes: Optional[str] = None

class LineItemUpdate(BaseModel):
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    pwk_price: Optional[float] = None
    pricing_flag: Optional[str] = None
    draw_stage: Optional[str] = None
    part_number: Optional[str] = None
    notes: Optional[str] = None


@router.post("/{plan_id}/house-types", status_code=201)
def add_house_type(plan_id: int, data: HouseTypeCreate, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    plan = db.query(Plan).filter_by(id=plan_id).first()
    if not plan:
        raise HTTPException(404, "Plan not found")
    ht = HouseType(plan_id=plan_id, **data.model_dump())
    db.add(ht)
    db.flush()
    # Auto-create one system per zone; insert standard inclusions into the first system
    for i in range(1, plan.number_of_zones + 1):
        zone = System(house_type_id=ht.id, system_number=f"{i:02d}",
                      zone_label=f"Zone {i}")
        db.add(zone)
        db.flush()
    db.commit()
    log_event(db, plan_id, "house_type_added", f"House type '{data.name}' added to {plan.plan_number}")
    db.commit()
    return {"id": ht.id}


@router.post("/{plan_id}/systems/{system_id}/line-items", status_code=201)
def add_line_item(plan_id: int, system_id: int, data: LineItemCreate, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    system = db.query(System).filter_by(id=system_id).first()
    if not system:
        raise HTTPException(404, "System not found")
    li = LineItem(system_id=system_id, **data.model_dump())
    db.add(li)
    db.commit()
    return {"id": li.id}


@router.patch("/{plan_id}/line-items/{line_item_id}")
def update_line_item(plan_id: int, line_item_id: int, data: LineItemUpdate, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    li = db.query(LineItem).filter_by(id=line_item_id).first()
    if not li:
        raise HTTPException(404, "Line item not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(li, k, v)
    db.commit()
    return {"ok": True}


@router.delete("/{plan_id}/line-items/{line_item_id}")
def delete_line_item(plan_id: int, line_item_id: int, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    li = db.query(LineItem).filter_by(id=line_item_id).first()
    if not li:
        raise HTTPException(404, "Line item not found")
    db.delete(li)
    db.commit()
    return {"ok": True}


@router.patch("/{plan_id}/systems/{system_id}")
def update_system(plan_id: int, system_id: int, data: SystemCreate, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    system = db.query(System).filter_by(id=system_id).first()
    if not system:
        raise HTTPException(404, "System not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(system, k, v)
    db.commit()
    return {"ok": True}


@router.post("/{plan_id}/copy-from/{source_plan_id}", status_code=201)
def copy_from_plan(plan_id: int, source_plan_id: int, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    plan = db.query(Plan).filter_by(id=plan_id).first()
    source = db.query(Plan).options(
        joinedload(Plan.house_types).joinedload(HouseType.systems).joinedload(System.line_items),
        joinedload(Plan.house_types).joinedload(HouseType.draws),
    ).filter_by(id=source_plan_id).first()
    if not plan or not source:
        raise HTTPException(404, "Plan not found")
    for ht in source.house_types:
        new_ht = HouseType(
            plan_id=plan_id,
            house_number=ht.house_number,
            name=ht.name,
            bid_hours=ht.bid_hours,
            pwk_sheet_metal=ht.pwk_sheet_metal,
            notes=ht.notes,
        )
        db.add(new_ht)
        db.flush()
        for sys in ht.systems:
            new_sys = System(
                house_type_id=new_ht.id,
                system_number=sys.system_number,
                zone_label=sys.zone_label,
                equipment_system_id=sys.equipment_system_id,
            )
            db.add(new_sys)
            db.flush()
            for li in sys.line_items:
                db.add(LineItem(
                    system_id=new_sys.id,
                    sort_order=li.sort_order,
                    pricing_flag=li.pricing_flag,
                    description=li.description,
                    quantity=li.quantity,
                    unit_price=li.unit_price,
                    pwk_price=li.pwk_price,
                    draw_stage=li.draw_stage,
                    part_number=li.part_number,
                ))
        for draw in ht.draws:
            db.add(Draw(
                house_type_id=new_ht.id,
                stage=draw.stage,
                amount=draw.amount,
                draw_number=draw.draw_number,
            ))
    db.commit()
    log_event(db, plan_id, "house_types_copied",
              f"House types copied from plan {source.plan_number}", current_user.username)
    db.commit()
    return {"ok": True}


@router.post("/{plan_id}/house-types/{house_type_id}/draws", status_code=201)
def add_draw(plan_id: int, house_type_id: int, data: DrawIn,
             db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ht = db.query(HouseType).filter_by(id=house_type_id, plan_id=plan_id).first()
    if not ht:
        raise HTTPException(404, "House type not found")
    draw = Draw(house_type_id=house_type_id, **data.model_dump())
    db.add(draw)
    db.commit()
    return {"id": draw.id}


@router.patch("/{plan_id}/house-types/{house_type_id}/draws/{draw_id}")
def update_draw(plan_id: int, house_type_id: int, draw_id: int, data: DrawIn,
                db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    draw = db.query(Draw).filter_by(id=draw_id, house_type_id=house_type_id).first()
    if not draw:
        raise HTTPException(404, "Draw not found")
    for k, v in data.model_dump().items():
        setattr(draw, k, v)
    db.commit()
    return {"ok": True}


@router.delete("/{plan_id}/house-types/{house_type_id}/draws/{draw_id}")
def delete_draw(plan_id: int, house_type_id: int, draw_id: int,
                db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    draw = db.query(Draw).filter_by(id=draw_id, house_type_id=house_type_id).first()
    if not draw:
        raise HTTPException(404, "Draw not found")
    db.delete(draw)
    db.commit()
    return {"ok": True}


# ── Comments ──────────────────────────────────────────────────────────────────

class CommentIn(BaseModel):
    body: str

@router.get("/{plan_id}/comments")
def list_comments(plan_id: int, db: Session = Depends(get_db),
                  _: User = Depends(get_current_user)):
    rows = (db.query(PlanComment)
              .filter_by(plan_id=plan_id)
              .order_by(PlanComment.created_at.asc())
              .all())
    return [{"id": c.id, "username": c.username, "full_name": c.full_name,
             "body": c.body, "created_at": c.created_at} for c in rows]

@router.post("/{plan_id}/comments", status_code=201)
def add_comment(plan_id: int, data: CommentIn, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    if not data.body.strip():
        raise HTTPException(400, "Comment body cannot be empty")
    c = PlanComment(plan_id=plan_id, username=current_user.username,
                    full_name=current_user.full_name, body=data.body.strip())
    db.add(c)
    db.commit()
    return {"id": c.id, "username": c.username, "full_name": c.full_name,
            "body": c.body, "created_at": c.created_at}

@router.delete("/{plan_id}/comments/{comment_id}")
def delete_comment(plan_id: int, comment_id: int, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    c = db.query(PlanComment).filter_by(id=comment_id, plan_id=plan_id).first()
    if not c:
        raise HTTPException(404, "Comment not found")
    if c.username != current_user.username and current_user.role != "admin":
        raise HTTPException(403, "Cannot delete another user's comment")
    db.delete(c)
    db.commit()
    return {"ok": True}


# ── Tasks ─────────────────────────────────────────────────────────────────────

class TaskIn(BaseModel):
    title:       str
    assigned_to: Optional[str] = None

class TaskUpdate(BaseModel):
    title:       Optional[str]  = None
    done:        Optional[bool] = None
    assigned_to: Optional[str]  = None

@router.get("/{plan_id}/tasks")
def list_tasks(plan_id: int, db: Session = Depends(get_db),
               _: User = Depends(get_current_user)):
    rows = (db.query(PlanTask)
              .filter_by(plan_id=plan_id)
              .order_by(PlanTask.created_at.asc())
              .all())
    return [{"id": t.id, "title": t.title, "done": t.done,
             "assigned_to": t.assigned_to, "created_by": t.created_by,
             "created_at": t.created_at} for t in rows]

@router.post("/{plan_id}/tasks", status_code=201)
def add_task(plan_id: int, data: TaskIn, db: Session = Depends(get_db),
             current_user: User = Depends(get_current_user)):
    if not data.title.strip():
        raise HTTPException(400, "Task title cannot be empty")
    t = PlanTask(plan_id=plan_id, title=data.title.strip(),
                 assigned_to=data.assigned_to, created_by=current_user.full_name)
    db.add(t)
    db.commit()
    return {"id": t.id, "title": t.title, "done": t.done,
            "assigned_to": t.assigned_to, "created_by": t.created_by,
            "created_at": t.created_at}

@router.patch("/{plan_id}/tasks/{task_id}")
def update_task(plan_id: int, task_id: int, data: TaskUpdate,
                db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    t = db.query(PlanTask).filter_by(id=task_id, plan_id=plan_id).first()
    if not t:
        raise HTTPException(404, "Task not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(t, k, v)
    db.commit()
    return {"ok": True}

@router.delete("/{plan_id}/tasks/{task_id}")
def delete_task(plan_id: int, task_id: int, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    t = db.query(PlanTask).filter_by(id=task_id, plan_id=plan_id).first()
    if not t:
        raise HTTPException(404, "Task not found")
    db.delete(t)
    db.commit()
    return {"ok": True}
