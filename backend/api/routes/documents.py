from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from core.database import get_db
from core.config import settings
from core.security import get_current_user
from models.models import Plan, Document, HouseType, System, Project, User, EventLog, CompanySettings
import os, datetime, base64, smtplib, logging, json

logger = logging.getLogger(__name__)
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication

router = APIRouter()

# ── Bid math constants (must match plans.py) ──────────────────
LABOR_RATE   = 86     # $/hr
SERVICE_RATE = 32     # $ per service visit
PERMIT_COST  = 170    # $ per permit

# Logo is pre-encoded at commit time — no runtime file I/O or DB seeding required.
try:
    from static.logo_b64 import LOGO_DATA_URI as _BUNDLED_LOGO
except ImportError:
    _BUNDLED_LOGO = ""


def _get_company(db: Session = None) -> dict:
    """Return company branding from DB, with bundled logo as fallback."""
    if db:
        row = db.query(CompanySettings).first()
        if row:
            return {
                "name":   row.company_name or "Metcalfe Heating & Air Conditioning",
                "phone":  row.phone or "",
                "email":  row.email or "",
                "footer": row.quote_footer or "",
                "logo":   row.logo_b64 or _BUNDLED_LOGO,
            }
    return {"name": "Metcalfe Heating & Air Conditioning", "phone": "", "email": "", "footer": "", "logo": _BUNDLED_LOGO}


def _zone_bid(sys, factor: float) -> dict:
    """Compute full bid breakdown for one system/zone."""
    mat_cost    = sum(float(li.quantity) * float(li.unit_price) for li in sys.line_items)
    mat_selling = mat_cost / factor if factor > 0 else 0.0
    equip       = float(sys.equipment_system.bid_price) if sys.equipment_system else 0.0
    labor       = float(sys.labor_hrs or 0) * LABOR_RATE
    service     = int(sys.service_qty or 0) * SERVICE_RATE
    permit      = PERMIT_COST if sys.permit_yn else 0.0
    tax         = mat_cost * float(sys.sales_tax_pct or 0.06)
    return {
        "mat_cost":    mat_cost,
        "mat_selling": mat_selling,
        "equip":       equip,
        "labor":       labor,
        "service":     service,
        "permit":      permit,
        "tax":         tax,
        "total":       mat_selling + equip + labor + service + permit + tax,
    }


# ── Quote (builder-facing) ────────────────────────────────────

def build_quote_html(plan, db=None) -> str:
    builder  = plan.project.builder
    now      = datetime.datetime.now().strftime("%B %d, %Y")
    co       = _get_company(db)
    logo_src = co["logo"]
    factor   = float(plan.factor) if plan.factor else 0.69

    addr_lines = []
    if builder.address:      addr_lines.append(builder.address)
    city_line = " ".join(filter(None, [
        builder.city,
        (f"{builder.state} {builder.zip_code}".strip()
         if (builder.state or builder.zip_code) else None),
    ]))
    if city_line.strip():    addr_lines.append(city_line)
    if builder.office_phone: addr_lines.append(f"Tel: {builder.office_phone}")
    if builder.cell_phone:   addr_lines.append(f"Cell: {builder.cell_phone}")
    if builder.email:        addr_lines.append(builder.email)
    builder_addr_html = "<br>".join(addr_lines) if addr_lines else ""

    # Per-zone rows + running totals
    zone_rows_html = ""
    totals     = {k: 0.0 for k in ("mat_selling", "equip", "labor", "service", "permit", "tax")}
    grand_total = 0.0

    for ht in plan.house_types:
        if len(plan.house_types) > 1:
            zone_rows_html += f'<tr class="ht-row"><td colspan="4">{ht.name}</td></tr>'
        for sys in sorted(ht.systems, key=lambda x: x.system_number):
            z = _zone_bid(sys, factor)
            for k in totals:
                totals[k] += z[k]
            grand_total += z["total"]
            label   = sys.zone_label or f"Zone {sys.system_number}"
            eq_code = sys.equipment_system.system_code if sys.equipment_system else "\u2014"
            eq_desc = sys.equipment_system.description if sys.equipment_system else ""
            zone_rows_html += (
                f'<tr>'
                f'<td style="font-weight:600">{label}</td>'
                f'<td><code>{eq_code}</code></td>'
                f'<td style="color:#555;font-size:8pt">{eq_desc}</td>'
                f'<td class="num">${z["total"]:,.2f}</td>'
                f'</tr>'
            )

    # Summary lines — only show non-zero entries
    summary_lines = [("Materials &amp; Installation", totals["mat_selling"])]
    if totals["equip"]   > 0: summary_lines.append(("Equipment",  totals["equip"]))
    if totals["labor"]   > 0: summary_lines.append(("Labor",      totals["labor"]))
    if totals["service"] > 0: summary_lines.append(("Service",    totals["service"]))
    if totals["permit"]  > 0: summary_lines.append(("Permit",     totals["permit"]))
    if totals["tax"]     > 0: summary_lines.append(("Sales Tax",  totals["tax"]))
    summary_html = "".join(
        f'<div class="sum-row"><span>{lbl}</span><span>${amt:,.2f}</span></div>'
        for lbl, amt in summary_lines
    )

    # Draw schedule
    draws_html = ""
    for ht in plan.house_types:
        if ht.draws:
            draws_html += f'<p class="draws-title">{ht.name} \u2014 Draw Schedule</p><div class="draws-grid">'
            for d in sorted(ht.draws, key=lambda x: x.draw_number):
                draws_html += (
                    f'<div class="draw-cell">'
                    f'<div class="draw-lbl">Draw {d.draw_number}</div>'
                    f'<div class="draw-stage">{d.stage.replace("_", " ").title()}</div>'
                    f'<div class="draw-amt">${float(d.amount):,.2f}</div>'
                    f'</div>'
                )
            draws_html += '</div>'

    co_contact_lines = [x for x in [co.get("phone"), co.get("email")] if x]
    co_contact_html  = "<br>".join(co_contact_lines)

    if logo_src:
        logo_html = f'<img src="{logo_src}" alt="{co["name"]}" class="logo">'
        if co_contact_html:
            logo_html += f'<div style="font-size:8pt;color:#555;margin-top:4px">{co_contact_html}</div>'
    else:
        logo_html = f'<div class="co-name">{co["name"]}</div>'
        if co_contact_html:
            logo_html += f'<div style="font-size:8pt;color:#555;margin-top:4px">{co_contact_html}</div>'

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  @page {{ size: letter portrait; margin: 18mm 16mm 18mm 16mm; }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          font-size: 9.5pt; color: #111; line-height: 1.45; }}
  code {{ font-family: monospace; font-size: 8pt; color: #333; }}

  .header {{ display:flex; justify-content:space-between; align-items:flex-start;
             margin-bottom:20px; padding-bottom:14px; border-bottom:2.5px solid #111; }}
  .logo {{ max-height:60px; max-width:210px; object-fit:contain; }}
  .co-name {{ font-size:18pt; font-weight:700; color:#111; }}
  .doc-title {{ font-size:16pt; font-weight:700; color:#111;
                letter-spacing:-0.02em; margin-bottom:4px; }}
  .doc-meta {{ font-size:8.5pt; color:#555; line-height:1.6; text-align:right; }}

  .info-grid {{ display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px; }}
  .info-box {{ border:1px solid #ccc; border-radius:4px; padding:10px 12px; }}
  .info-label {{ font-size:7.5pt; font-weight:700; text-transform:uppercase;
                 letter-spacing:0.06em; color:#888; margin-bottom:5px; }}
  .info-box strong {{ font-size:10pt; display:block; margin-bottom:2px; }}
  .info-box p {{ font-size:8.5pt; color:#444; line-height:1.6; }}

  table {{ width:100%; border-collapse:collapse; margin-bottom:20px; font-size:8.5pt; }}
  thead tr {{ background:#1a1a1a; color:white; }}
  thead th {{ padding:7px 10px; text-align:left; font-size:8pt;
              letter-spacing:0.03em; font-weight:600; }}
  thead th.num {{ text-align:right; }}
  tbody tr {{ border-bottom:1px solid #eee; }}
  tbody tr:nth-child(even) {{ background:#fafafa; }}
  td {{ padding:5px 10px; }}
  td.num {{ text-align:right; }}
  .ht-row td {{ background:#e2e2e2; font-weight:700; font-size:8.5pt;
                padding:6px 10px; border-top:1px solid #bbb; }}

  .summary-box {{ border:1px solid #ccc; border-radius:4px; padding:14px 16px;
                  margin-bottom:20px; max-width:360px; margin-left:auto; }}
  .sum-row {{ display:flex; justify-content:space-between; padding:4px 0;
              border-bottom:1px solid #efefef; font-size:8.5pt; }}
  .sum-row:last-child {{ border-bottom:none; }}
  .total-line {{ display:flex; justify-content:space-between; align-items:baseline;
                 border-top:2px solid #111; margin-top:8px; padding-top:8px; }}
  .total-line .lbl {{ font-size:11pt; font-weight:700; }}
  .total-line .amt {{ font-size:13pt; font-weight:700; }}

  .draws-section {{ margin-bottom:20px; }}
  .draws-title {{ font-size:9pt; font-weight:700; margin-bottom:8px; }}
  .draws-grid {{ display:flex; gap:8px; flex-wrap:wrap; }}
  .draw-cell {{ flex:1; min-width:80px; border:1px solid #ccc; border-radius:4px;
                padding:8px 10px; text-align:center; }}
  .draw-lbl {{ font-size:7.5pt; font-weight:700; text-transform:uppercase;
               letter-spacing:0.05em; color:#333; }}
  .draw-stage {{ font-size:7.5pt; color:#555; margin:2px 0; }}
  .draw-amt {{ font-size:10pt; font-weight:700; color:#111; }}

  .scope-grid {{ display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px; }}
  .scope-box {{ border:1px solid #ccc; border-radius:4px; padding:10px 12px; }}
  .scope-label {{ font-size:7.5pt; font-weight:700; text-transform:uppercase;
                  letter-spacing:0.06em; color:#888; margin-bottom:6px; }}
  .scope-items {{ font-size:8.5pt; color:#333; line-height:1.7; white-space:pre-wrap; }}

  .footer {{ border-top:1px solid #ccc; padding-top:10px; margin-top:4px;
             font-size:7.5pt; color:#888; display:flex; justify-content:space-between; }}
</style>
</head>
<body>

  <div class="header">
    <div>{logo_html}</div>
    <div>
      <div class="doc-title">Bid Proposal</div>
      <div class="doc-meta">
        Plan #&nbsp;<strong style="color:#111">{plan.plan_number}</strong><br>
        Date: {now}<br>
        Status: {plan.status.title()}
      </div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="info-label">Builder</div>
      <strong>{builder.name}</strong>
      <p>{f'{builder.contact_name}<br>' if builder.contact_name else ''}{builder_addr_html}</p>
    </div>
    <div class="info-box">
      <div class="info-label">Project</div>
      <strong>{plan.project.name}</strong>
      <p>
        Code: {plan.project.code}<br>
        House type: {plan.house_type or '—'}<br>
        Estimator: {plan.estimator_name}
      </p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Zone</th>
        <th>Equipment Code</th>
        <th>Description</th>
        <th class="num" style="width:100px">Zone Bid</th>
      </tr>
    </thead>
    <tbody>
      {zone_rows_html}
    </tbody>
  </table>

  <div class="summary-box">
    {summary_html}
    <div class="total-line">
      <span class="lbl">Total Bid</span>
      <span class="amt">${grand_total:,.2f}</span>
    </div>
  </div>

  {f'<div class="draws-section">{draws_html}</div>' if draws_html else ''}

  {(
    '<div class="scope-grid">'
    + ('<div class="scope-box"><div class="scope-label">Scope Includes</div>'
       + '<div class="scope-items">' + (plan.includes or '').replace('&','&amp;').replace('<','&lt;') + '</div></div>'
       if plan.includes else '')
    + ('<div class="scope-box"><div class="scope-label">Not Included</div>'
       + '<div class="scope-items">' + (plan.excludes or '').replace('&','&amp;').replace('<','&lt;') + '</div></div>'
       if plan.excludes else '')
    + '</div>'
  ) if (plan.includes or plan.excludes) else ''}

  <div class="footer">
    <span>{co["name"]} &middot; Plan # {plan.plan_number} &middot; {plan.estimator_name}</span>
    <span>{co["footer"] or ("This proposal is valid for 30 days from " + now)}</span>
  </div>

</body>
</html>"""


@router.post("/{plan_id}/generate")
def generate_quote(plan_id: int, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    plan = db.query(Plan).options(
        joinedload(Plan.project).joinedload(Project.builder),
        joinedload(Plan.house_types).joinedload(HouseType.systems).joinedload(System.line_items),
        joinedload(Plan.house_types).joinedload(HouseType.systems).joinedload(System.equipment_system),
        joinedload(Plan.house_types).joinedload(HouseType.draws),
    ).filter_by(id=plan_id).first()

    if not plan:
        raise HTTPException(404, "Plan not found")

    estimator_folder = os.path.join(
        settings.STORAGE_PATH,
        plan.estimator_name.replace(" ", "_")
    )
    os.makedirs(estimator_folder, exist_ok=True)

    html = build_quote_html(plan, db)
    pdf_path  = os.path.join(estimator_folder, f"{plan.plan_number}_quote.pdf")
    html_path = os.path.join(estimator_folder, f"{plan.plan_number}_quote.html")

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)

    pdf_generated = False
    try:
        from weasyprint import HTML
        HTML(string=html, base_url=estimator_folder).write_pdf(pdf_path)
        pdf_generated = True
        output_path = pdf_path
        filename    = f"{plan.plan_number}_quote.pdf"
    except Exception as e:
        logger.warning("WeasyPrint failed for %s quote, falling back to HTML: %s", plan.plan_number, e)
        output_path = html_path
        filename    = f"{plan.plan_number}_quote.html"

    last = db.query(Document).filter_by(plan_id=plan_id, doc_type="quote") \
              .order_by(Document.version.desc()).first()
    next_version = (last.version + 1) if last else 1

    ext = ".pdf" if pdf_generated else ".html"
    versioned_name = f"{plan.plan_number}_quote_v{next_version}{ext}"
    versioned_path = os.path.join(estimator_folder, versioned_name)
    import shutil
    shutil.copy2(output_path, versioned_path)

    doc = Document(plan_id=plan_id, doc_type="quote",
                   version=next_version, storage_path=versioned_path)
    db.add(doc)
    db.commit()

    return {
        "doc_id":        doc.id,
        "path":          versioned_path,
        "filename":      versioned_name,
        "version":       next_version,
        "pdf":           pdf_generated,
        "html_fallback": html_path,
    }


@router.get("/{plan_id}/history")
def quote_history(plan_id: int, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    docs = db.query(Document).filter_by(plan_id=plan_id, doc_type="quote") \
              .order_by(Document.version.desc()).all()
    return [
        {
            "id":           d.id,
            "doc_type":     d.doc_type,
            "version":      d.version,
            "filename":     os.path.basename(d.storage_path or ""),
            "generated_at": d.generated_at,
        }
        for d in docs
    ]


@router.get("/{plan_id}/history/{doc_id}/download")
def download_quote_version(plan_id: int, doc_id: int,
                           db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter_by(id=doc_id, plan_id=plan_id, doc_type="quote").first()
    if not doc or not doc.storage_path or not os.path.exists(doc.storage_path):
        raise HTTPException(404, "Quote version not found")
    filename   = os.path.basename(doc.storage_path)
    media_type = "application/pdf" if filename.endswith(".pdf") else "text/html"
    return FileResponse(doc.storage_path, filename=filename, media_type=media_type,
                        headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.get("/{plan_id}/preview")
def preview_quote(plan_id: int, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    """Serve the quote HTML directly in the browser for preview."""
    from fastapi.responses import HTMLResponse
    plan = db.query(Plan).options(
        joinedload(Plan.project).joinedload(Project.builder),
        joinedload(Plan.house_types).joinedload(HouseType.systems).joinedload(System.line_items),
        joinedload(Plan.house_types).joinedload(HouseType.systems).joinedload(System.equipment_system),
        joinedload(Plan.house_types).joinedload(HouseType.draws),
    ).filter_by(id=plan_id).first()

    if not plan:
        raise HTTPException(404, "Plan not found")

    html = build_quote_html(plan, db)
    return HTMLResponse(content=html)


class EmailQuoteIn(BaseModel):
    to:      str
    subject: str
    message: str = ""


@router.post("/{plan_id}/email-quote")
def email_quote(
    plan_id: int,
    body: EmailQuoteIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Email the most recently generated quote PDF (or HTML fallback) to the
    given address. Uses the shared SMTP account; Reply-To is set to the
    logged-in estimator's email so replies go directly to them.
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        raise HTTPException(503, "Email is not configured on this server.")

    doc = db.query(Document).filter_by(
        plan_id=plan_id, doc_type="quote"
    ).order_by(Document.generated_at.desc()).first()

    if not doc or not doc.storage_path or not os.path.isfile(doc.storage_path):
        raise HTTPException(404, "No quote file found — generate the quote first.")

    filepath = doc.storage_path
    filename = os.path.basename(filepath)
    is_pdf   = filename.endswith(".pdf")

    msg = MIMEMultipart()
    msg["From"]     = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
    msg["To"]       = body.to
    msg["Subject"]  = body.subject
    if current_user.email:
        msg["Reply-To"] = f"{current_user.full_name} <{current_user.email}>"

    body_text = body.message.strip() if body.message.strip() else (
        f"Please find the attached HVAC quote.\n\n"
        f"Estimator: {current_user.full_name}\n"
    )
    msg.attach(MIMEText(body_text, "plain"))

    with open(filepath, "rb") as f:
        part = MIMEApplication(
            f.read(),
            _subtype="pdf" if is_pdf else "octet-stream",
        )
        part.add_header("Content-Disposition", "attachment", filename=filename)
        msg.attach(part)

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, [body.to], msg.as_string())
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(502, "SMTP authentication failed — check SMTP_USER/SMTP_PASSWORD in .env.")
    except Exception as e:
        raise HTTPException(502, f"Failed to send email: {e}")

    db.add(EventLog(
        username=current_user.username,
        plan_id=plan_id,
        event_type="email_sent",
        description=json.dumps({"to": body.to, "subject": body.subject, "filename": filename}),
    ))
    db.commit()

    return {"sent": True, "to": body.to, "filename": filename}


@router.get("/{plan_id}/download")
def download_quote(plan_id: int, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    """Download the most recently generated quote as a file attachment."""
    doc = db.query(Document).filter_by(
        plan_id=plan_id, doc_type="quote"
    ).order_by(Document.generated_at.desc()).first()

    if not doc or not doc.storage_path:
        raise HTTPException(404, "No quote generated yet — click Generate Quote first.")

    path = doc.storage_path
    if not os.path.exists(path):
        raise HTTPException(404, "Quote file not found on disk — try regenerating it.")

    filename   = os.path.basename(path)
    media_type = "application/pdf" if path.endswith(".pdf") else "text/html"
    return FileResponse(
        path,
        filename=filename,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# ── Field Sheet (installer-facing) ───────────────────────────

def build_field_sheet_html(plan, db=None) -> str:
    builder  = plan.project.builder
    now      = datetime.datetime.now().strftime("%B %d, %Y")
    co       = _get_company(db)
    logo_src = co["logo"]

    co_contact_lines2 = [x for x in [co.get("phone"), co.get("email")] if x]
    co_contact_html2  = "<br>".join(co_contact_lines2)

    if logo_src:
        logo_html = f'<img src="{logo_src}" alt="{co["name"]}" class="logo">'
        if co_contact_html2:
            logo_html += f'<div style="font-size:8pt;color:#555;margin-top:4px">{co_contact_html2}</div>'
    else:
        logo_html = f'<div class="co-name">{co["name"]}</div>'
        if co_contact_html2:
            logo_html += f'<div style="font-size:8pt;color:#555;margin-top:4px">{co_contact_html2}</div>'

    house_sections = ""
    for ht in plan.house_types:
        # Zone layout rows
        zone_rows = ""
        for sys in sorted(ht.systems, key=lambda x: x.system_number):
            label   = sys.zone_label or f"Zone {sys.system_number}"
            eq_code = sys.equipment_system.system_code if sys.equipment_system else "\u2014"
            eq_desc = sys.equipment_system.description if sys.equipment_system else ""
            zone_rows += (
                f'<tr>'
                f'<td style="font-weight:600">{label}</td>'
                f'<td><code>{eq_code}</code></td>'
                f'<td style="color:#555;font-size:8pt">{eq_desc}</td>'
                f'</tr>'
            )

        # Line item rows (no prices — just description + qty + checkbox)
        li_rows = ""
        for sys in sorted(ht.systems, key=lambda x: x.system_number):
            label = sys.zone_label or f"Zone {sys.system_number}"
            for li in sorted(sys.line_items, key=lambda x: x.sort_order):
                li_rows += (
                    f'<tr>'
                    f'<td class="zone-col">{label}</td>'
                    f'<td class="desc-col">{li.description}</td>'
                    f'<td class="qty-col">{float(li.quantity):.0f}</td>'
                    f'<td class="chk-col"><div class="checkbox"></div></td>'
                    f'</tr>'
                )

        house_sections += f"""
        <div class="ht-block">
          <div class="ht-header">{ht.name}</div>
          <div class="section-label">Zone Layout</div>
          <table class="zone-table">
            <thead>
              <tr><th>Zone</th><th>Equipment Code</th><th>Description</th></tr>
            </thead>
            <tbody>{zone_rows}</tbody>
          </table>
          <div class="section-label">Line Items &amp; Inclusions</div>
          <table class="li-table">
            <thead>
              <tr>
                <th class="zone-col">Zone</th>
                <th class="desc-col">Description</th>
                <th class="qty-col">Qty</th>
                <th class="chk-col">&#10003;</th>
              </tr>
            </thead>
            <tbody>{li_rows}</tbody>
          </table>
        </div>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  @page {{ size: letter portrait; margin: 16mm 16mm 16mm 16mm; }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          font-size: 9.5pt; color: #111; line-height: 1.45; }}
  code {{ font-family: monospace; font-size: 8pt; color: #333; }}

  .header {{ display:flex; justify-content:space-between; align-items:flex-start;
             margin-bottom:18px; padding-bottom:12px; border-bottom:2.5px solid #111; }}
  .logo {{ max-height:56px; max-width:200px; object-fit:contain; }}
  .co-name {{ font-size:17pt; font-weight:700; color:#111; }}
  .doc-title {{ font-size:15pt; font-weight:700; color:#111; margin-bottom:3px; }}
  .doc-meta {{ font-size:8pt; color:#555; line-height:1.7; text-align:right; }}

  .info-grid {{ display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:18px; }}
  .info-box {{ border:1px solid #ccc; border-radius:4px; padding:9px 12px; }}
  .info-label {{ font-size:7pt; font-weight:700; text-transform:uppercase;
                 letter-spacing:0.06em; color:#888; margin-bottom:4px; }}
  .info-value {{ font-size:10pt; font-weight:600; color:#111; margin-bottom:1px; }}
  .info-sub {{ font-size:8.5pt; color:#444; }}

  .ht-block {{ margin-bottom:24px; page-break-inside:avoid; }}
  .ht-header {{ background:#1a1a1a; color:white; padding:8px 14px;
                border-radius:4px 4px 0 0; font-weight:700; font-size:11pt; }}
  .section-label {{ font-size:7.5pt; font-weight:700; text-transform:uppercase;
                    letter-spacing:0.06em; color:#888; padding:7px 12px 5px;
                    border:1px solid #ccc; border-top:none; background:#f5f5f5; }}

  table {{ width:100%; border-collapse:collapse; font-size:8.5pt; margin-bottom:0; }}
  .zone-table {{ border:1px solid #ccc; border-top:none; }}
  .li-table {{ border:1px solid #ccc; border-top:none; border-radius:0 0 4px 4px; }}
  thead tr {{ background:#333; color:white; }}
  thead th {{ padding:5px 10px; text-align:left; font-size:8pt; font-weight:600; }}
  tbody tr {{ border-bottom:1px solid #eee; }}
  tbody tr:nth-child(even) {{ background:#fafafa; }}
  td {{ padding:5px 10px; }}
  .zone-col {{ width:90px; font-size:8pt; color:#555; }}
  .qty-col {{ width:40px; text-align:center; }}
  .chk-col {{ width:30px; text-align:center; }}
  .checkbox {{ width:16px; height:16px; border:1.5px solid #888; border-radius:2px; margin:0 auto; }}

  .notes-page {{ page-break-before:always; padding-top:4px; }}
  .notes-box {{ border:1px solid #ccc; border-radius:4px; overflow:hidden; margin-bottom:24px; }}
  .notes-header {{ padding:8px 14px; background:#f5f5f5; border-bottom:1px solid #ccc;
                   font-size:7.5pt; font-weight:700; text-transform:uppercase;
                   letter-spacing:0.06em; color:#888; }}
  .notes-body {{ padding:12px 14px; min-height:72px; font-size:8.5pt; color:#444; }}
  .sig-grid {{ display:grid; grid-template-columns:2fr 1fr; gap:32px; }}
  .sig-lbl {{ font-size:7.5pt; font-weight:700; text-transform:uppercase;
              letter-spacing:0.06em; color:#888; margin-bottom:28px; }}
  .sig-line {{ border-bottom:1.5px solid #333; }}
  .sig-sub {{ font-size:7.5pt; color:#888; margin-top:4px; }}

  .footer {{ border-top:1px solid #ccc; padding-top:8px; font-size:7pt; color:#888;
             display:flex; justify-content:space-between; margin-top:16px; }}
</style>
</head>
<body>

  <div class="header">
    <div>{logo_html}</div>
    <div>
      <div class="doc-title">Field Sheet</div>
      <div class="doc-meta">
        Plan #&nbsp;<strong style="color:#111">{plan.plan_number}</strong><br>
        Date: {now}<br>
        Estimator: {plan.estimator_name}
      </div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="info-label">Builder</div>
      <div class="info-value">{builder.name}</div>
      <div class="info-sub">{builder.contact_name or ''}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Project</div>
      <div class="info-value">{plan.project.name}</div>
      <div class="info-sub">Code: {plan.project.code}</div>
    </div>
  </div>

  {house_sections}

  <div class="notes-page">
    <div class="notes-box">
      <div class="notes-header">Field Notes</div>
      <div class="notes-body">{plan.notes if plan.notes else '&nbsp;'}</div>
    </div>
    <div class="sig-grid">
      <div>
        <div class="sig-lbl">Foreman Signature</div>
        <div class="sig-line"></div>
        <div class="sig-sub">Signature</div>
      </div>
      <div>
        <div class="sig-lbl">Date Completed</div>
        <div class="sig-line"></div>
        <div class="sig-sub">Date</div>
      </div>
    </div>
    <div class="footer">
      <span>{co["name"]} &middot; Field Sheet &middot; Plan # {plan.plan_number}</span>
      <span>Generated {now}</span>
    </div>
  </div>

</body>
</html>"""


@router.post("/{plan_id}/field-sheet/generate")
def generate_field_sheet(plan_id: int, db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_user)):
    plan = db.query(Plan).options(
        joinedload(Plan.project).joinedload(Project.builder),
        joinedload(Plan.house_types).joinedload(HouseType.systems).joinedload(System.line_items),
        joinedload(Plan.house_types).joinedload(HouseType.systems).joinedload(System.equipment_system),
    ).filter_by(id=plan_id).first()

    if not plan:
        raise HTTPException(404, "Plan not found")

    estimator_folder = os.path.join(
        settings.STORAGE_PATH,
        plan.estimator_name.replace(" ", "_")
    )
    os.makedirs(estimator_folder, exist_ok=True)

    html = build_field_sheet_html(plan, db)
    pdf_path  = os.path.join(estimator_folder, f"{plan.plan_number}_field_sheet.pdf")
    html_path = os.path.join(estimator_folder, f"{plan.plan_number}_field_sheet.html")

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)

    pdf_generated = False
    try:
        from weasyprint import HTML
        HTML(string=html, base_url=estimator_folder).write_pdf(pdf_path)
        pdf_generated = True
        output_path = pdf_path
        filename    = f"{plan.plan_number}_field_sheet.pdf"
    except Exception as e:
        logger.warning("WeasyPrint failed for %s field sheet, falling back to HTML: %s", plan.plan_number, e)
        output_path = html_path
        filename    = f"{plan.plan_number}_field_sheet.html"

    doc = Document(plan_id=plan_id, doc_type="field_sheet", storage_path=output_path)
    db.add(doc)
    db.commit()

    return {
        "path":          output_path,
        "filename":      filename,
        "pdf":           pdf_generated,
        "html_fallback": html_path,
    }


@router.get("/{plan_id}/field-sheet/download")
def download_field_sheet(plan_id: int, db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_user)):
    """Download the most recently generated field sheet."""
    doc = db.query(Document).filter_by(
        plan_id=plan_id, doc_type="field_sheet"
    ).order_by(Document.generated_at.desc()).first()

    if not doc or not doc.storage_path:
        raise HTTPException(404, "No field sheet generated yet — click Field Sheet first.")

    path = doc.storage_path
    if not os.path.exists(path):
        raise HTTPException(404, "Field sheet file not found on disk — try regenerating it.")

    filename   = os.path.basename(path)
    media_type = "application/pdf" if path.endswith(".pdf") else "text/html"
    return FileResponse(
        path,
        filename=filename,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# ── Top Sheet (internal job cost) ─────────────────────────────

def build_top_sheet_html(plan, db=None) -> str:
    co      = _get_company(db)
    now     = datetime.datetime.now().strftime("%B %d, %Y")
    factor  = float(plan.factor) if plan.factor else 0.69
    logo_src3 = co["logo"]

    # Per-zone cost breakdown
    zone_rows_html = ""
    totals = {k: 0.0 for k in
              ("mat_cost", "mat_selling", "equip", "labor", "service", "permit", "tax", "total")}

    for ht in plan.house_types:
        if len(plan.house_types) > 1:
            zone_rows_html += f'<tr class="ht-row"><td colspan="9">{ht.name}</td></tr>'
        for sys in sorted(ht.systems, key=lambda x: x.system_number):
            z = _zone_bid(sys, factor)
            for k in totals:
                totals[k] += z[k]
            label   = sys.zone_label or f"Zone {sys.system_number}"
            eq_code = sys.equipment_system.system_code if sys.equipment_system else "\u2014"

            def _d(val):
                return f"${val:,.2f}" if val else "\u2014"

            zone_rows_html += (
                f'<tr>'
                f'<td style="font-weight:600">{label}</td>'
                f'<td><code>{eq_code}</code></td>'
                f'<td class="num">${z["mat_cost"]:,.2f}</td>'
                f'<td class="num">${z["mat_selling"]:,.2f}</td>'
                f'<td class="num">{_d(z["equip"])}</td>'
                f'<td class="num">{_d(z["labor"])}</td>'
                f'<td class="num">{_d(z["service"])}</td>'
                f'<td class="num">{_d(z["permit"])}</td>'
                f'<td class="num bold">${z["total"]:,.2f}</td>'
                f'</tr>'
            )

    grand_total = totals["total"]
    mat_margin  = totals["mat_selling"] - totals["mat_cost"]
    margin_pct  = (mat_margin / grand_total * 100) if grand_total else 0.0

    def _d(val):
        return f"${val:,.2f}" if val else "\u2014"

    # Build bid breakdown rows
    bid_rows = [("Material cost (at cost)", totals["mat_cost"])]
    bid_rows.append((f"Material selling (cost &divide; {factor:.2f})", totals["mat_selling"]))
    if totals["equip"]   > 0: bid_rows.append(("Equipment",         totals["equip"]))
    if totals["labor"]   > 0: bid_rows.append(("Labor",             totals["labor"]))
    if totals["service"] > 0: bid_rows.append(("Service",           totals["service"]))
    if totals["permit"]  > 0: bid_rows.append(("Permit",            totals["permit"]))
    if totals["tax"]     > 0: bid_rows.append(("Tax collected",     totals["tax"]))
    bid_rows_html = "".join(
        f'<div class="kv"><span>{lbl}</span><span class="v">${amt:,.2f}</span></div>'
        for lbl, amt in bid_rows
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  @page {{ size: letter landscape; margin: 14mm 16mm 14mm 16mm; }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: Arial, Helvetica, sans-serif; font-size: 9pt;
          color: #111; line-height: 1.4; }}
  code {{ font-family: monospace; font-size: 8pt; color: #333; }}
  h1 {{ font-size: 16pt; font-weight: 700; text-align: center; margin-bottom: 2px; }}
  .sub {{ text-align: center; font-size: 10pt; color: #555; margin-bottom: 14px; }}

  .meta {{ display:flex; justify-content:space-between; border:1px solid #ccc;
           padding:8px 12px; margin-bottom:14px; font-size:9pt; gap:32px; }}
  .meta div {{ line-height:1.8; }}

  table {{ width:100%; border-collapse:collapse; margin-bottom:14px; font-size:9pt; }}
  thead tr {{ background:#1a1a1a; color:white; }}
  thead th {{ padding:6px 8px; text-align:left; font-size:8pt; font-weight:600; }}
  thead th.num {{ text-align:right; }}
  tbody tr {{ border-bottom:1px solid #eee; }}
  tbody tr:nth-child(even) {{ background:#fafafa; }}
  td {{ padding:4px 8px; }}
  td.num {{ text-align:right; }}
  td.bold {{ font-weight:700; }}
  tr.ht-row td {{ background:#e2e2e2; font-weight:700; font-size:8.5pt;
                  padding:5px 8px; border-top:1px solid #bbb; }}
  tr.totals-row td {{ background:#1a1a1a; color:white; font-weight:700;
                      padding:7px 8px; font-size:9.5pt; }}

  .two-col {{ display:flex; gap:16px; margin-bottom:14px; }}
  .box {{ flex:1; border:1px solid #ccc; padding:10px 14px; border-radius:4px; }}
  .box h3 {{ font-size:8pt; font-weight:700; text-transform:uppercase;
             letter-spacing:0.05em; color:#555; margin-bottom:8px; }}
  .kv {{ display:flex; justify-content:space-between; padding:3px 0;
         border-bottom:1px solid #f0f0f0; font-size:9pt; }}
  .kv:last-child {{ border-bottom:none; }}
  .kv .v {{ font-weight:600; }}
  .kv.total {{ border-top:2px solid #111; margin-top:6px; padding-top:7px;
               font-weight:700; font-size:10pt; }}
  .kv.margin {{ font-size:10pt; font-weight:700; }}

  .footer {{ font-size:8pt; color:#888; text-align:center; margin-top:16px;
             border-top:1px solid #ddd; padding-top:8px; }}
</style>
</head>
<body>

  {'<div style="text-align:center;margin-bottom:6px"><img src="' + logo_src3 + '" alt="' + co["name"] + '" style="max-height:50px;max-width:200px;object-fit:contain"></div>' if logo_src3 else f'<h1>{co["name"]}</h1>'}
  <div class="sub">Job Cost Top Sheet &mdash; Internal Use Only</div>

  <div class="meta">
    <div>
      <strong>Plan #:</strong> {plan.plan_number}<br>
      <strong>Project:</strong> {plan.project.name}<br>
      <strong>Builder:</strong> {plan.project.builder.name}
    </div>
    <div>
      <strong>Date:</strong> {now}<br>
      <strong>Estimator:</strong> {plan.estimator_name}<br>
      <strong>Status:</strong> {plan.status.title()}
    </div>
    <div>
      <strong>Factor:</strong> {factor:.4f}<br>
      <strong>Implied Margin:</strong> {(1 - factor) * 100:.1f}%<br>
      <strong>Labor Rate:</strong> ${LABOR_RATE}/hr
    </div>
  </div>

  <!-- Per-zone breakdown table -->
  <table>
    <thead>
      <tr>
        <th>Zone</th>
        <th>Equipment</th>
        <th class="num">Mat Cost</th>
        <th class="num">Mat Selling</th>
        <th class="num">Equipment</th>
        <th class="num">Labor</th>
        <th class="num">Service</th>
        <th class="num">Permit</th>
        <th class="num">Zone Total</th>
      </tr>
    </thead>
    <tbody>
      {zone_rows_html}
      <tr class="totals-row">
        <td colspan="2">TOTALS</td>
        <td class="num">${totals["mat_cost"]:,.2f}</td>
        <td class="num">${totals["mat_selling"]:,.2f}</td>
        <td class="num">{_d(totals["equip"])}</td>
        <td class="num">{_d(totals["labor"])}</td>
        <td class="num">{_d(totals["service"])}</td>
        <td class="num">{_d(totals["permit"])}</td>
        <td class="num">${grand_total:,.2f}</td>
      </tr>
    </tbody>
  </table>

  <div class="two-col">
    <div class="box">
      <h3>Bid Breakdown</h3>
      {bid_rows_html}
      <div class="kv total">
        <span>TOTAL BID</span>
        <span class="v">${grand_total:,.2f}</span>
      </div>
    </div>
    <div class="box">
      <h3>Margin Summary</h3>
      <div class="kv"><span>Factor applied</span><span class="v">{factor:.4f}</span></div>
      <div class="kv"><span>Implied margin %</span><span class="v">{(1 - factor) * 100:.1f}%</span></div>
      <div class="kv"><span>Material cost</span><span class="v">${totals["mat_cost"]:,.2f}</span></div>
      <div class="kv"><span>Material selling</span><span class="v">${totals["mat_selling"]:,.2f}</span></div>
      <div class="kv margin">
        <span>Material margin</span>
        <span class="v">${mat_margin:,.2f}</span>
      </div>
      <div class="kv"><span>% of total bid</span><span class="v">{margin_pct:.1f}%</span></div>
    </div>
  </div>

  <div class="footer">
    {co["name"]} &middot; Plan # {plan.plan_number} &middot; {plan.estimator_name}
    &middot; Generated {now} &middot; Internal use only &mdash; not for distribution
  </div>

</body>
</html>"""


@router.post("/{plan_id}/top-sheet/generate")
def generate_top_sheet(plan_id: int, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    plan = db.query(Plan).options(
        joinedload(Plan.project).joinedload(Project.builder),
        joinedload(Plan.house_types).joinedload(HouseType.systems).joinedload(System.line_items),
        joinedload(Plan.house_types).joinedload(HouseType.systems).joinedload(System.equipment_system),
    ).filter_by(id=plan_id).first()
    if not plan:
        raise HTTPException(404, "Plan not found")

    html      = build_top_sheet_html(plan, db)
    base_name = f"{plan.plan_number}_top_sheet"
    html_path = os.path.join(settings.STORAGE_PATH, f"{base_name}.html")
    pdf_path  = os.path.join(settings.STORAGE_PATH, f"{base_name}.pdf")

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)

    pdf_generated = False
    try:
        from weasyprint import HTML
        HTML(string=html, base_url=settings.STORAGE_PATH).write_pdf(pdf_path)
        pdf_generated = True
        output_path = pdf_path
        filename    = f"{base_name}.pdf"
    except Exception as e:
        logger.warning("WeasyPrint failed for %s top sheet, falling back to HTML: %s", plan.plan_number, e)
        output_path = html_path
        filename    = f"{base_name}.html"

    doc = Document(plan_id=plan_id, doc_type="top_sheet", storage_path=output_path, version=1)
    db.add(doc)
    db.commit()

    return {"filename": filename, "doc_id": doc.id}


@router.get("/{plan_id}/top-sheet/download")
def download_top_sheet(plan_id: int, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter_by(
        plan_id=plan_id, doc_type="top_sheet"
    ).order_by(Document.generated_at.desc()).first()

    if not doc or not doc.storage_path or not os.path.exists(doc.storage_path):
        raise HTTPException(404, "No top sheet generated yet.")

    filename   = os.path.basename(doc.storage_path)
    media_type = "application/pdf" if filename.endswith(".pdf") else "text/html"
    return FileResponse(
        doc.storage_path,
        filename=filename,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
