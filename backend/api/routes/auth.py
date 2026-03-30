from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import httpx
import time
from jose import jwt, JWTError
from core.database import get_db
from core.security import (
    verify_password, hash_password, create_access_token,
    get_current_user, require_admin
)
from core.config import settings
from models.models import User

router = APIRouter()


class UserOut(BaseModel):
    id:        int
    username:  str
    full_name: str
    initials:  str
    email:     Optional[str]
    role:      str
    active:    bool


class UserCreate(BaseModel):
    username:  str
    full_name: str
    initials:  str
    email:     Optional[str] = None
    password:  str
    role:      str = "account_manager"


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    initials:  Optional[str] = None
    email:     Optional[str] = None
    role:      Optional[str] = None
    active:    Optional[bool] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password:     str


class SelfUpdate(BaseModel):
    full_name: Optional[str] = None
    initials:  Optional[str] = None
    email:     Optional[str] = None


# ── Auth endpoints ────────────────────────────────────────────

@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter_by(username=form.username, active=True).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type":   "bearer",
        "user": {
            "id":        user.id,
            "username":  user.username,
            "full_name": user.full_name,
            "initials":  user.initials,
            "email":     user.email,
            "role":      user.role,
        }
    }


# ── Microsoft Entra SSO ───────────────────────────────────────

# Simple in-memory JWKS cache: {keys: [...], fetched_at: float}
_jwks_cache: dict = {}
_JWKS_TTL = 3600  # refresh public keys hourly


def _get_microsoft_jwks(tenant_id: str) -> dict:
    now = time.time()
    if _jwks_cache.get("fetched_at", 0) + _JWKS_TTL > now:
        return _jwks_cache["keys"]
    url = f"https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys"
    resp = httpx.get(url, timeout=10)
    resp.raise_for_status()
    keys = resp.json()
    _jwks_cache["keys"] = keys
    _jwks_cache["fetched_at"] = now
    return keys


class MicrosoftTokenIn(BaseModel):
    id_token: str


@router.post("/microsoft")
def microsoft_sso(data: MicrosoftTokenIn, db: Session = Depends(get_db)):
    """
    Accepts a Microsoft ID token from the frontend MSAL flow.
    Validates it, matches the user by email, and issues our own JWT.
    """
    if not settings.AZURE_CLIENT_ID or not settings.AZURE_TENANT_ID:
        raise HTTPException(503, "Microsoft SSO is not configured on this server")

    # Validate the ID token using Microsoft's public keys
    try:
        jwks = _get_microsoft_jwks(settings.AZURE_TENANT_ID)
        payload = jwt.decode(
            data.id_token,
            jwks,
            algorithms=["RS256"],
            audience=settings.AZURE_CLIENT_ID,
            issuer=f"https://login.microsoftonline.com/{settings.AZURE_TENANT_ID}/v2.0",
        )
    except JWTError as e:
        raise HTTPException(401, f"Invalid Microsoft token: {e}")
    except Exception as e:
        raise HTTPException(502, f"Could not verify Microsoft token: {e}")

    # Extract email — Microsoft uses preferred_username (UPN) or email claim
    ms_email = (payload.get("preferred_username") or payload.get("email") or "").lower().strip()
    if not ms_email:
        raise HTTPException(401, "No email claim found in Microsoft token")

    # Match to an existing user account by email
    user = db.query(User).filter(
        User.email.ilike(ms_email),
        User.active == True,
    ).first()
    if not user:
        raise HTTPException(
            403,
            f"No active account found for {ms_email}. "
            "Ask your administrator to create an account with this email address."
        )

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type":   "bearer",
        "user": {
            "id":        user.id,
            "username":  user.username,
            "full_name": user.full_name,
            "initials":  user.initials,
            "email":     user.email,
            "role":      user.role,
        }
    }


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id":        current_user.id,
        "username":  current_user.username,
        "full_name": current_user.full_name,
        "initials":  current_user.initials,
        "email":     current_user.email,
        "role":      current_user.role,
    }


@router.patch("/me")
def update_me(data: SelfUpdate, current_user: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(current_user, k, v)
    db.commit()
    return {"ok": True}


@router.post("/me/password")
def change_password(data: PasswordChange, current_user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(400, "Current password is incorrect")
    if len(data.new_password) < 8:
        raise HTTPException(400, "New password must be at least 8 characters")
    current_user.hashed_password = hash_password(data.new_password)
    db.commit()
    return {"ok": True}


# ── User management (admin only) ─────────────────────────────

@router.get("/users")
def list_users(admin=Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.full_name).all()
    return [
        {
            "id":        u.id,
            "username":  u.username,
            "full_name": u.full_name,
            "initials":  u.initials,
            "email":     u.email,
            "role":      u.role,
            "active":    u.active,
            "created_at": u.created_at,
        }
        for u in users
    ]


@router.post("/users", status_code=201)
def create_user(data: UserCreate, admin=Depends(require_admin), db: Session = Depends(get_db)):
    if db.query(User).filter_by(username=data.username).first():
        raise HTTPException(400, f"Username '{data.username}' already exists")
    if data.email and db.query(User).filter_by(email=data.email).first():
        raise HTTPException(400, f"Email already in use")
    if db.query(User).filter_by(initials=data.initials.upper()).first():
        raise HTTPException(400, f"Initials '{data.initials.upper()}' already in use by another user")
    user = User(
        username=data.username,
        full_name=data.full_name,
        initials=data.initials.upper(),
        email=data.email,
        hashed_password=hash_password(data.password),
        role=data.role,
    )
    db.add(user)
    db.commit()
    return {"id": user.id, "username": user.username}


@router.patch("/users/{user_id}")
def update_user(user_id: int, data: UserUpdate, admin=Depends(require_admin),
                db: Session = Depends(get_db)):
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(user, k, v)
    db.commit()
    return {"ok": True}


@router.post("/users/{user_id}/reset-password")
def reset_password(user_id: int, body: dict, admin=Depends(require_admin),
                   db: Session = Depends(get_db)):
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    new_pw = body.get("password", "")
    if len(new_pw) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    user.hashed_password = hash_password(new_pw)
    db.commit()
    return {"ok": True}


@router.delete("/users/{user_id}")
def deactivate_user(user_id: int, admin=Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.active = False
    db.commit()
    return {"ok": True}
