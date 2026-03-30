"""
Microsoft Entra ID (Azure AD) SSO Integration
==============================================

Flow:
  1. User hits GET /auth/sso/login  -> redirected to Microsoft
  2. Microsoft redirects to GET /auth/sso/callback?code=...
  3. We exchange the code for tokens, read the user's profile,
     create/update the user record, then issue our own JWT.

Required env vars (add to .env):
    AZURE_TENANT_ID       = your-tenant-id
    AZURE_CLIENT_ID       = your-app-client-id
    AZURE_CLIENT_SECRET   = your-app-client-secret
    AZURE_REDIRECT_URI    = https://yourdomain.com/auth/sso/callback

Azure AD App Registration checklist:
  - Platform: Web
  - Redirect URI: must match AZURE_REDIRECT_URI exactly
  - API permissions: openid, profile, email, User.Read
  - Optional: add Group claims if you want group -> role mapping

Install:
    pip install msal
"""

import os
import msal  # pip install msal
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import create_access_token
from models.models import User
from passlib.context import CryptContext
import secrets

router = APIRouter(prefix="/auth/sso", tags=["SSO"])

# ── Config ────────────────────────────────────────────────────
TENANT_ID     = os.getenv("AZURE_TENANT_ID")
CLIENT_ID     = os.getenv("AZURE_CLIENT_ID")
CLIENT_SECRET = os.getenv("AZURE_CLIENT_SECRET")
REDIRECT_URI  = os.getenv("AZURE_REDIRECT_URI", "http://localhost:8000/auth/sso/callback")
AUTHORITY     = f"https://login.microsoftonline.com/{TENANT_ID}"
SCOPES        = ["openid", "profile", "email", "User.Read"]

# Map Azure AD group object IDs -> our roles.
# Fill these in once you have the group IDs from your Azure portal.
# Any user not in a mapped group gets the default role.
GROUP_ROLE_MAP = {
    # "00000000-0000-0000-0000-000000000000": "admin",
    # "11111111-1111-1111-1111-111111111111": "account_executive",
    # "22222222-2222-2222-2222-222222222222": "account_manager",
}
DEFAULT_ROLE = "account_manager"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _msal_app():
    """Create a confidential MSAL application."""
    if not all([TENANT_ID, CLIENT_ID, CLIENT_SECRET]):
        raise HTTPException(503, "Entra SSO is not configured. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET.")
    return msal.ConfidentialClientApplication(
        CLIENT_ID,
        authority=AUTHORITY,
        client_credential=CLIENT_SECRET,
    )


def _resolve_role(id_token_claims: dict) -> str:
    """
    Derive our app role from the Azure token claims.
    Priority:
      1. App roles assigned directly in Azure (token claim 'roles')
      2. Group membership (token claim 'groups') -> GROUP_ROLE_MAP
      3. DEFAULT_ROLE
    """
    # Direct app role assignment (configure via "App roles" in Azure portal)
    app_roles = id_token_claims.get("roles", [])
    if "Admin" in app_roles:
        return "admin"
    if "AccountExecutive" in app_roles:
        return "account_executive"
    if "AccountManager" in app_roles:
        return "account_manager"

    # Group membership fallback
    for group_id in id_token_claims.get("groups", []):
        if group_id in GROUP_ROLE_MAP:
            return GROUP_ROLE_MAP[group_id]

    return DEFAULT_ROLE


# ── Routes ────────────────────────────────────────────────────

@router.get("/login")
def sso_login():
    """Redirect the user to the Microsoft login page."""
    app = _msal_app()
    auth_url = app.get_authorization_request_url(
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI,
        # state can be used to pass a frontend redirect target
    )
    return RedirectResponse(auth_url)


@router.get("/callback")
def sso_callback(code: str = None, error: str = None, db: Session = Depends(get_db)):
    """
    Microsoft redirects here after the user authenticates.
    Exchange the authorization code for tokens, then log the user in.
    """
    if error:
        raise HTTPException(400, f"Azure AD error: {error}")
    if not code:
        raise HTTPException(400, "No authorization code received.")

    app = _msal_app()
    result = app.acquire_token_by_authorization_code(
        code,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI,
    )

    if "error" in result:
        raise HTTPException(401, f"Token exchange failed: {result.get('error_description')}")

    claims = result.get("id_token_claims", {})

    # Extract user info from token claims
    upn      = claims.get("preferred_username", "")  # user@company.com
    name     = claims.get("name", upn)
    email    = claims.get("email") or upn
    oid      = claims.get("oid", "")                 # Azure object ID — stable unique identifier

    # Derive a safe username from the UPN (strip domain)
    username = upn.split("@")[0].lower().replace(".", "").replace("-", "")[:50]

    # Derive initials from display name
    parts    = name.strip().split()
    initials = (parts[0][0] + parts[-1][0]).upper() if len(parts) >= 2 else name[:2].upper()

    # Look up or create the user
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        user = db.query(User).filter(User.username == username).first()

    role = _resolve_role(claims)

    if user is None:
        # First SSO login — provision the account
        user = User(
            username        = username,
            full_name       = name,
            initials        = initials,
            email           = email,
            # SSO users don't need a password, but the column is NOT NULL.
            # Store a random bcrypt hash that can never be used to log in.
            hashed_password = pwd_context.hash(secrets.token_hex(32)),
            role            = role,
            active          = True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Subsequent logins — sync name/email from Azure, update role if group changed
        user.full_name = name
        user.email     = email
        user.role      = role
        user.active    = True
        db.commit()

    # Issue our standard JWT — rest of the app is unchanged
    token = create_access_token({"sub": user.username})

    # In production: redirect to the frontend with the token as a query param
    # or use HttpOnly cookies. Here we return JSON for API testing.
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(f"{frontend_url}/sso-callback?token={token}&user={user.username}")
