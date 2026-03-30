"""
Salesforce CRM Integration
===========================

Syncs data bidirectionally between Salesforce and the HVAC Bid System.

Mapping:
  SF Account       <-> builders   (code = SF Account.HVAC_Builder_Code__c)
  SF Opportunity   <-> projects   (code = SF Opportunity.HVAC_Project_Code__c)
  SF HVAC_Plan__c  <- plans       (push only — operational data owned here)

Sync directions:
  Salesforce -> HVAC : new builders and projects pulled from SF on demand
  HVAC -> Salesforce : contracted/complete plans pushed to update SF Opportunities

Required env vars (add to .env):
    SF_USERNAME        = your@company.com
    SF_PASSWORD        = yourpassword
    SF_SECURITY_TOKEN  = yourtoken   (from SF: My Settings > Personal > Reset My Security Token)
    SF_DOMAIN          = login       (use 'test' for sandbox)

Install:
    pip install simple-salesforce

Custom fields needed in Salesforce (create via Setup > Object Manager):
  On Account:
    HVAC_Builder_Code__c  (Text, 10, External ID + Unique)
  On Opportunity:
    HVAC_Project_Code__c  (Text, 10, External ID + Unique)
    HVAC_Bid_Value__c     (Currency)
    HVAC_Status__c        (Picklist: draft/proposed/contracted/complete/lost)
    HVAC_Plan_Count__c    (Number)
"""

import os
from datetime import datetime
from simple_salesforce import Salesforce, SalesforceLogin, exceptions as sf_exc  # pip install simple-salesforce
from sqlalchemy.orm import Session
from models.models import Builder, Project, Plan

# ── Config ────────────────────────────────────────────────────
def _sf_client() -> Salesforce:
    """Create an authenticated Salesforce client."""
    username = os.getenv("SF_USERNAME")
    password = os.getenv("SF_PASSWORD")
    token    = os.getenv("SF_SECURITY_TOKEN", "")
    domain   = os.getenv("SF_DOMAIN", "login")  # 'test' for sandbox

    if not all([username, password]):
        raise RuntimeError("Salesforce credentials not configured. Set SF_USERNAME, SF_PASSWORD, SF_SECURITY_TOKEN.")

    return Salesforce(
        username       = username,
        password       = password,
        security_token = token,
        domain         = domain,
    )


# ── SF -> HVAC: Pull builders ─────────────────────────────────

def pull_builders_from_sf(db: Session) -> dict:
    """
    Pull Salesforce Accounts that have HVAC_Builder_Code__c set
    and upsert them into the builders table.
    Returns a summary dict.
    """
    sf = _sf_client()
    result = sf.query("""
        SELECT Id, Name, HVAC_Builder_Code__c,
               BillingStreet, BillingCity, BillingState, BillingPostalCode,
               Phone, Website
        FROM Account
        WHERE HVAC_Builder_Code__c != null
        LIMIT 2000
    """)

    inserted = updated = skipped = 0
    for rec in result["records"]:
        code = rec["HVAC_Builder_Code__c"]
        if not code:
            skipped += 1
            continue

        existing = db.query(Builder).filter(Builder.code == code).first()
        if existing:
            existing.name    = rec["Name"]
            existing.address = rec.get("BillingStreet")
            existing.city    = rec.get("BillingCity")
            existing.state   = rec.get("BillingState")
            existing.zip_code = rec.get("BillingPostalCode")
            existing.office_phone = rec.get("Phone")
            updated += 1
        else:
            db.add(Builder(
                code         = code,
                name         = rec["Name"],
                address      = rec.get("BillingStreet"),
                city         = rec.get("BillingCity"),
                state        = rec.get("BillingState"),
                zip_code     = rec.get("BillingPostalCode"),
                office_phone = rec.get("Phone"),
                active       = True,
            ))
            inserted += 1

    db.commit()
    return {"inserted": inserted, "updated": updated, "skipped": skipped}


# ── SF -> HVAC: Pull projects ─────────────────────────────────

def pull_projects_from_sf(db: Session) -> dict:
    """
    Pull Salesforce Opportunities (with HVAC_Project_Code__c set)
    and upsert them into the projects table.
    """
    sf = _sf_client()
    result = sf.query("""
        SELECT Id, Name, HVAC_Project_Code__c,
               Account.HVAC_Builder_Code__c
        FROM Opportunity
        WHERE HVAC_Project_Code__c != null
          AND StageName NOT IN ('Closed Lost')
        LIMIT 2000
    """)

    # Build builder code -> id map
    builders = {b.code: b.id for b in db.query(Builder).all()}

    inserted = updated = skipped = 0
    for rec in result["records"]:
        code       = rec["HVAC_Project_Code__c"]
        build_code = rec.get("Account", {}).get("HVAC_Builder_Code__c")
        builder_id = builders.get(build_code)

        if not code or not builder_id:
            skipped += 1
            continue

        existing = db.query(Project).filter(Project.code == code).first()
        if existing:
            existing.name       = rec["Name"]
            existing.builder_id = builder_id
            updated += 1
        else:
            db.add(Project(
                code       = code,
                name       = rec["Name"],
                builder_id = builder_id,
                active     = True,
            ))
            inserted += 1

    db.commit()
    return {"inserted": inserted, "updated": updated, "skipped": skipped}


# ── HVAC -> SF: Push plan outcomes ───────────────────────────

def push_plans_to_sf(db: Session, plan_ids: list[int] = None) -> dict:
    """
    Push contracted/complete plans to Salesforce as HVAC_Plan__c records
    and update the parent Opportunity with aggregate bid data.

    If plan_ids is None, pushes all contracted/complete plans.
    """
    sf = _sf_client()

    query = db.query(Plan).filter(Plan.status.in_(["contracted", "complete"]))
    if plan_ids:
        query = query.filter(Plan.id.in_(plan_ids))
    plans = query.all()

    pushed = failed = 0
    for plan in plans:
        # Build the payload for the custom HVAC_Plan__c object
        payload = {
            "Name":                  plan.plan_number,
            "HVAC_Plan_Number__c":   plan.plan_number,
            "HVAC_Status__c":        plan.status,
            "HVAC_Estimator__c":     plan.estimator_name,
            "HVAC_House_Type__c":    plan.house_type or "",
            "HVAC_Total_Bid__c":     float(plan.total_bid) if plan.total_bid else 0.0,
            "HVAC_Zones__c":         plan.number_of_zones,
            "HVAC_Created_Date__c":  plan.created_at.isoformat() if plan.created_at else None,
        }

        # Link to the SF Opportunity via the project code
        if plan.project and plan.project.code:
            opp_result = sf.query(
                f"SELECT Id FROM Opportunity WHERE HVAC_Project_Code__c = '{plan.project.code}' LIMIT 1"
            )
            if opp_result["records"]:
                payload["HVAC_Opportunity__c"] = opp_result["records"][0]["Id"]

        try:
            # Upsert on plan number so re-runs are idempotent
            sf.HVAC_Plan__c.upsert(f"HVAC_Plan_Number__c/{plan.plan_number}", payload)
            pushed += 1
        except sf_exc.SalesforceMalformedRequest as e:
            print(f"SF push failed for {plan.plan_number}: {e}")
            failed += 1

    return {"pushed": pushed, "failed": failed}


# ── FastAPI router (mount in main.py when ready) ──────────────

from fastapi import APIRouter, Depends, HTTPException
from core.database import get_db
from core.security import require_admin

sf_router = APIRouter(prefix="/integrations/salesforce", tags=["Salesforce"])

@sf_router.post("/pull-builders", dependencies=[Depends(require_admin)])
def api_pull_builders(db: Session = Depends(get_db)):
    """Pull builder accounts from Salesforce into the local database."""
    try:
        return pull_builders_from_sf(db)
    except RuntimeError as e:
        raise HTTPException(503, str(e))

@sf_router.post("/pull-projects", dependencies=[Depends(require_admin)])
def api_pull_projects(db: Session = Depends(get_db)):
    """Pull project opportunities from Salesforce into the local database."""
    try:
        return pull_projects_from_sf(db)
    except RuntimeError as e:
        raise HTTPException(503, str(e))

@sf_router.post("/push-plans", dependencies=[Depends(require_admin)])
def api_push_plans(db: Session = Depends(get_db)):
    """Push all contracted/complete plans up to Salesforce."""
    try:
        return push_plans_to_sf(db)
    except RuntimeError as e:
        raise HTTPException(503, str(e))
