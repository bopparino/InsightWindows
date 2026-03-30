from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from core.database import get_db
from core.security import get_current_user
from models.models import Suggestion, User

router = APIRouter()


class FeedbackIn(BaseModel):
    type: str = "feedback"   # "feedback" | "bug" | "idea"
    subject: str
    message: str


class FeedbackOut(BaseModel):
    id: int
    type: str
    subject: str
    message: str
    user_name: str
    status: str

    class Config:
        from_attributes = True


@router.post("", response_model=FeedbackOut, status_code=201)
def submit_feedback(
    body: FeedbackIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not body.subject.strip():
        raise HTTPException(status_code=422, detail="Subject is required")
    if not body.message.strip():
        raise HTTPException(status_code=422, detail="Message is required")

    entry = Suggestion(
        user_id=current_user.id,
        user_name=current_user.full_name,
        type=body.type,
        subject=body.subject.strip(),
        message=body.message.strip(),
        status="open",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("", response_model=list[FeedbackOut])
def list_feedback(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin-only: list all feedback submissions."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    return db.query(Suggestion).order_by(Suggestion.submitted_at.desc()).all()
