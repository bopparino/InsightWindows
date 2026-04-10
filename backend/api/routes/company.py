from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from core.database import get_db
from core.security import get_current_user, require_admin
from models.models import CompanySettings, User

router = APIRouter()


class CompanyIn(BaseModel):
    company_name: str
    phone:        Optional[str] = None
    email:        Optional[str] = None
    address:      Optional[str] = None
    city:         Optional[str] = None
    state:        Optional[str] = None
    zip_code:     Optional[str] = None
    website:      Optional[str] = None
    quote_footer: Optional[str] = None
    logo_b64:     Optional[str] = None


def _get_or_create(db: Session) -> CompanySettings:
    row = db.query(CompanySettings).first()
    if not row:
        row = CompanySettings()
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def _serialize(row: CompanySettings) -> dict:
    return {
        "company_name": row.company_name,
        "phone":        row.phone,
        "email":        row.email,
        "address":      row.address,
        "city":         row.city,
        "state":        row.state,
        "zip_code":     row.zip_code,
        "website":      row.website,
        "quote_footer": row.quote_footer,
        "logo_b64":     row.logo_b64,
    }


@router.get("/")
def get_company(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return _serialize(_get_or_create(db))


@router.patch("/", dependencies=[Depends(require_admin)])
def update_company(data: CompanyIn, db: Session = Depends(get_db)):
    row = _get_or_create(db)
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(row, k, v)
    db.commit()
    return _serialize(row)
