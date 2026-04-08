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

LOGO_B64 = None

def get_logo_b64() -> str:
    """Load logo as base64 so it embeds directly in HTML — no path issues."""
    global LOGO_B64
    if LOGO_B64:
        return LOGO_B64
    logo_path = settings.COMPANY_LOGO_PATH
    if os.path.exists(logo_path):
        with open(logo_path, "rb") as f:
            ext = os.path.splitext(logo_path)[1].lower().replace(".", "")
            mime = "jpeg" if ext in ("jpg", "jpeg") else ext
            LOGO_B64 = f"data:image/{mime};base64,{base64.b64encode(f.read()).decode()}"
    return LOGO_B64 or ""


def _get_company(db: Session = None) -> dict:
    """Return company branding from DB, with safe defaults."""
    if db:
        row = db.query(CompanySettings).first()
        if row:
            return {
                "name":   row.company_name or "Insight HVAC",
                "phone":  row.phone or "",
                "email":  row.email or "",
                "footer": row.quote_footer or "",
                "logo":   row.logo_b64 or get_logo_b64() or "",
            }
    return {"name": "Insight HVAC", "phone": "", "email": "", "footer": "", "logo": get_logo_b64() or ""}


def build_quote_html(plan, db=None) -> str:
    builder  = plan.project.builder
    now      = datetime.datetime.now().strftime("%B %d, %Y")
    co       = _get_company(db)
    logo_src = co["logo"]

    # Builder address block
    addr_lines = []
    if builder.address:
        addr_lines.append(builder.address)
    city_line = " ".join(filter(None, [builder.city,
                                        f"{builder.state} {builder.zip_code}".strip() if builder.state or builder.zip_code else None]))
    if city_line.strip():
        addr_lines.append(city_line)
    if builder.office_phone:
        addr_lines.append(f"Tel: {builder.office_phone}")
    if builder.cell_phone:
        addr_lines.append(f"Cell: {builder.cell_phone}")
    if builder.email:
        addr_lines.append(builder.email)
    builder_addr_html = "<br>".join(addr_lines) if addr_lines else ""

    # Line items
    rows_html   = ""
    grand_total  = 0.0
    item_count   = sum(len(s.line_items) for ht in plan.house_types for s in ht.systems)
    for ht in plan.house_types:
        # House type section header
        rows_html += f"""
        <tr class="ht-header">
          <td colspan="4">{ht.name}
            {'— ' + str(ht.bid_hours) + 'h labor' if ht.bid_hours else ''}
          </td>
        </tr>"""
        for sys in ht.systems:
            rows_html += f"""
            <tr class="zone-row">
              <td colspan="4">Zone {sys.system_number}
                {' — ' + sys.zone_label if sys.zone_label else ''}
                {' · ' + sys.equipment_system.system_code if sys.equipment_system else ''}
              </td>
            </tr>"""
            for li in sorted(sys.line_items, key=lambda x: x.sort_order):
                ext = float(li.quantity) * float(li.unit_price)
                grand_total += ext
                price_cell = (
                    f'<td class="num">STD</td>'
                    if ext == 0 and float(li.unit_price) == 0
                    else f'<td class="num">${ext:,.2f}</td>'
                )
                rows_html += f"""
                <tr>
                  <td>{li.description}
                    {f'<span class="pn">[{li.part_number}]</span>' if li.part_number else ''}
                  </td>
                  <td class="num">{float(li.quantity):.1f}</td>
                  <td class="num">${float(li.unit_price):,.2f}</td>
                  {price_cell}
                </tr>"""

    # Draw schedule
    draws_html = ""
    for ht in plan.house_types:
        if ht.draws:
            draws_html += f'<p style="margin:0 0 4px;font-weight:600">{ht.name} — Draw Schedule</p>'
            draws_html += '<table class="draws-table"><tr>'
            for d in sorted(ht.draws, key=lambda x: x.draw_number):
                draws_html += f"""
                <td>
                  <div class="draw-label">Draw {d.draw_number}</div>
                  <div class="draw-stage">{d.stage.replace('_',' ').title()}</div>
                  <div class="draw-amt">${float(d.amount):,.2f}</div>
                </td>"""
            draws_html += '</tr></table>'

    logo_html = (
        f'<img src="{logo_src}" alt="{co["name"]}" class="logo">'
        if logo_src else
        f'<div class="company-name-text">{co["name"]}</div>'
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  @page {{
    size: letter portrait;
    margin: 18mm 16mm 18mm 16mm;
  }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 9.5pt;
    color: #1e293b;
    line-height: 1.45;
  }}

  /* Header */
  .header {{
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 2.5px solid #1a3a5c;
  }}
  .logo {{ max-height: 64px; max-width: 220px; object-fit: contain; }}
  .company-name-text {{ font-size: 20pt; font-weight: 700; color: #1a3a5c; }}
  .header-right {{ text-align: right; }}
  .doc-title {{
    font-size: 16pt; font-weight: 700; color: #1a3a5c;
    letter-spacing: -0.02em; margin-bottom: 4px;
  }}
  .doc-meta {{ font-size: 8.5pt; color: #64748b; line-height: 1.6; }}

  /* Info grid */
  .info-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 20px;
  }}
  .info-box {{
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 12px;
  }}
  .info-box-label {{
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #94a3b8;
    margin-bottom: 5px;
  }}
  .info-box strong {{ font-size: 10pt; color: #1e293b; display: block; margin-bottom: 2px; }}
  .info-box p {{ font-size: 8.5pt; color: #475569; line-height: 1.6; margin: 0; }}

  /* Line items table */
  .items-table {{
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
    font-size: 8.5pt;
  }}
  .items-table thead tr {{
    background: #1a3a5c;
    color: white;
  }}
  .items-table thead th {{
    padding: 7px 10px;
    text-align: left;
    font-weight: 600;
    font-size: 8pt;
    letter-spacing: 0.03em;
  }}
  .items-table thead th.num {{ text-align: right; }}
  .items-table tbody tr {{ border-bottom: 1px solid #f1f5f9; }}
  .items-table tbody tr:nth-child(even) {{ background: #f8fafc; }}
  .items-table td {{ padding: 5px 10px; }}
  .items-table td.num {{ text-align: right; color: #334155; }}
  .items-table .ht-header td {{
    background: #e8f0fe;
    color: #1a3a5c;
    font-weight: 700;
    font-size: 8.5pt;
    padding: 6px 10px;
    border-top: 1px solid #bfdbfe;
  }}
  .items-table .zone-row td {{
    background: #f1f5f9;
    color: #475569;
    font-size: 8pt;
    font-style: italic;
    padding: 4px 10px;
  }}
  .pn {{ color: #94a3b8; font-size: 7.5pt; margin-left: 6px; }}

  /* Total */
  .total-row {{
    background: #1a3a5c !important;
    color: white;
  }}
  .total-row td {{
    padding: 8px 10px !important;
    font-weight: 700;
    font-size: 10pt;
    color: white !important;
  }}
  .total-row td.num {{ text-align: right; font-size: 12pt; }}

  /* Draws */
  .draws-section {{
    margin-bottom: 20px;
    padding: 12px 14px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 8.5pt;
  }}
  .draws-table {{ width: 100%; border-collapse: collapse; margin-top: 8px; }}
  .draws-table td {{
    text-align: center;
    padding: 8px 10px;
    border: 1px solid #e2e8f0;
    background: white;
    border-radius: 4px;
    width: 25%;
  }}
  .draw-label {{ font-size: 7.5pt; font-weight: 700; color: #1a3a5c;
    text-transform: uppercase; letter-spacing: 0.05em; }}
  .draw-stage {{ font-size: 7.5pt; color: #64748b; margin: 2px 0; }}
  .draw-amt {{ font-size: 10pt; font-weight: 700; color: #1a3a5c; }}

  /* Footer */
  .footer {{
    border-top: 1px solid #e2e8f0;
    padding-top: 10px;
    font-size: 7.5pt;
    color: #94a3b8;
    display: flex;
    justify-content: space-between;
  }}
</style>
</head>
<body>

  <div class="header">
    <div>{logo_html}</div>
    <div class="header-right">
      <div class="doc-title">Bid Proposal</div>
      <div class="doc-meta">
        Plan # <strong style="color:#1e293b">{plan.plan_number}</strong><br>
        Date: {now}<br>
        Status: {plan.status.title()}
      </div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="info-box-label">Builder</div>
      <strong>{builder.name}</strong>
      <p>
        {f'{builder.contact_name}<br>' if builder.contact_name else ''}
        {builder_addr_html}
      </p>
    </div>
    <div class="info-box">
      <div class="info-box-label">Project Details</div>
      <strong>{plan.project.name}</strong>
      <p>
        Project code: {plan.project.code}<br>
        House type: {plan.house_type or '—'}<br>
        Zones: {plan.number_of_zones}<br>
        Estimator: {plan.estimator_name}
      </p>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th>Description</th>
        <th class="num" style="width:52px">Qty</th>
        <th class="num" style="width:80px">Unit Price</th>
        <th class="num" style="width:90px">Extended</th>
      </tr>
    </thead>
    <tbody>
      {rows_html}
      <tr class="total-row">
        <td colspan="3">Total Bid</td>
        <td class="num">{"No items added yet" if item_count == 0 else f"${grand_total:,.2f}"}</td>
      </tr>
    </tbody>
  </table>

  {f'<div class="draws-section">{draws_html}</div>' if draws_html else ''}

  <div class="footer">
    <span>{co["name"]} · Plan # {plan.plan_number} · {plan.estimator_name}</span>
    <span>{co["footer"] if co["footer"] else f"This proposal is valid for 30 days from {now}"}</span>
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

    # Always save HTML as backup / preview
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)

    # Try WeasyPrint for PDF
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

    # Auto-increment version for this plan+doc_type
    last = db.query(Document).filter_by(plan_id=plan_id, doc_type="quote") \
              .order_by(Document.version.desc()).first()
    next_version = (last.version + 1) if last else 1

    # Version-stamped filenames so old files aren't overwritten
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

    # Find latest generated quote for this plan
    doc = db.query(Document).filter_by(
        plan_id=plan_id, doc_type="quote"
    ).order_by(Document.generated_at.desc()).first()

    if not doc or not doc.storage_path or not os.path.isfile(doc.storage_path):
        raise HTTPException(404, "No quote file found — generate the quote first.")

    filepath = doc.storage_path
    filename = os.path.basename(filepath)
    is_pdf   = filename.endswith(".pdf")

    # Build the message
    msg = MIMEMultipart()
    msg["From"]     = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
    msg["To"]       = body.to
    msg["Subject"]  = body.subject
    if current_user.email:
        msg["Reply-To"] = f"{current_user.full_name} <{current_user.email}>"

    # Body text
    body_text = body.message.strip() if body.message.strip() else (
        f"Please find the attached HVAC quote.\n\n"
        f"Estimator: {current_user.full_name}\n"
    )
    msg.attach(MIMEText(body_text, "plain"))

    # Attach the file
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
        raise HTTPException(404,
            "No quote generated yet — click Generate Quote first.")

    path = doc.storage_path
    if not os.path.exists(path):
        raise HTTPException(404,
            "Quote file not found on disk — try regenerating it.")

    filename = os.path.basename(path)
    media_type = "application/pdf" if path.endswith(".pdf") else "text/html"
    return FileResponse(
        path,
        filename=filename,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# ── Field Sheet ───────────────────────────────────────────────

def build_field_sheet_html(plan, db=None) -> str:
    builder  = plan.project.builder
    now      = datetime.datetime.now().strftime("%B %d, %Y")
    co       = _get_company(db)
    logo_src = co["logo"]

    logo_html = (
        f'<img src="{logo_src}" alt="{co["name"]}" class="logo">'
        if logo_src else
        f'<div class="company-name-text">{co["name"]}</div>'
    )

    house_sections = ""
    for ht in plan.house_types:
        # Zone layout table
        zones_rows = ""
        for sys in sorted(ht.systems, key=lambda x: x.system_number):
            eq_code = sys.equipment_system.system_code if sys.equipment_system else "—"
            zones_rows += f"""
            <tr>
              <td style="font-weight:600;color:#1a3a5c;padding:5px 10px">{sys.zone_label or f"Zone {sys.system_number}"}</td>
              <td style="font-family:monospace;padding:5px 10px">{eq_code}</td>
            </tr>"""

        # Line items table
        li_rows = ""
        for sys in sorted(ht.systems, key=lambda x: x.system_number):
            for li in sorted(sys.line_items, key=lambda x: x.sort_order):
                li_rows += f"""
                <tr style="border-bottom:1px solid #f1f5f9">
                  <td style="padding:5px 10px;color:#64748b;font-size:8pt;width:30px">{li.sort_order}</td>
                  <td style="padding:5px 10px;font-size:8.5pt">{li.description}</td>
                  <td style="padding:5px 10px;text-align:center;font-size:8.5pt;width:40px">{float(li.quantity):.0f}</td>
                  <td style="padding:5px 10px;width:28px">
                    <div style="width:16px;height:16px;border:1.5px solid #cbd5e1;border-radius:3px"></div>
                  </td>
                </tr>"""

        house_sections += f"""
        <div style="margin-bottom:28px;page-break-inside:avoid">
          <div style="background:#1a3a5c;color:white;padding:8px 14px;border-radius:6px 6px 0 0;
            font-weight:700;font-size:11pt;letter-spacing:-0.01em">
            {ht.name}
            {'<span style="font-weight:400;font-size:9pt;margin-left:12px;opacity:0.8">' + str(ht.bid_hours) + 'h labor</span>' if ht.bid_hours else ''}
          </div>

          <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 6px 6px;overflow:hidden">
            <div style="padding:10px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0">
              <span style="font-size:7.5pt;font-weight:700;text-transform:uppercase;
                letter-spacing:0.06em;color:#94a3b8">Zone Layout</span>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:9pt">
              <thead>
                <tr style="background:#f1f5f9">
                  <th style="padding:5px 10px;text-align:left;font-size:8pt;color:#475569">Zone</th>
                  <th style="padding:5px 10px;text-align:left;font-size:8pt;color:#475569">Equipment Model</th>
                </tr>
              </thead>
              <tbody>{zones_rows}</tbody>
            </table>

            <div style="padding:10px 14px;background:#f8fafc;
              border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin-top:8px">
              <span style="font-size:7.5pt;font-weight:700;text-transform:uppercase;
                letter-spacing:0.06em;color:#94a3b8">Line Items — Standard Inclusions</span>
            </div>
            <table style="width:100%;border-collapse:collapse">
              <thead>
                <tr style="background:#f1f5f9">
                  <th style="padding:5px 10px;text-align:left;font-size:8pt;color:#475569;width:30px">#</th>
                  <th style="padding:5px 10px;text-align:left;font-size:8pt;color:#475569">Description</th>
                  <th style="padding:5px 10px;text-align:center;font-size:8pt;color:#475569;width:40px">Qty</th>
                  <th style="padding:5px 10px;text-align:center;font-size:8pt;color:#475569;width:28px"></th>
                </tr>
              </thead>
              <tbody>{li_rows}</tbody>
            </table>
          </div>
        </div>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  @page {{
    size: letter portrait;
    margin: 16mm 16mm 16mm 16mm;
  }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 9.5pt;
    color: #1e293b;
    line-height: 1.45;
  }}
  .header {{
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 18px;
    padding-bottom: 14px;
    border-bottom: 2.5px solid #1a3a5c;
  }}
  .logo {{ max-height: 56px; max-width: 200px; object-fit: contain; }}
  .company-name-text {{ font-size: 18pt; font-weight: 700; color: #1a3a5c; }}
  .doc-title {{ font-size: 15pt; font-weight: 700; color: #1a3a5c; margin-bottom: 3px; }}
  .doc-meta {{ font-size: 8pt; color: #64748b; line-height: 1.7; text-align: right; }}
  .info-grid {{
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 10px; margin-bottom: 18px;
  }}
  .info-box {{
    border: 1px solid #e2e8f0; border-radius: 6px; padding: 9px 12px;
  }}
  .info-label {{
    font-size: 7pt; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; color: #94a3b8; margin-bottom: 4px;
  }}
  .info-value {{ font-size: 10pt; font-weight: 600; color: #1e293b; margin-bottom: 1px; }}
  .info-sub {{ font-size: 8.5pt; color: #475569; }}
  .footer {{
    border-top: 1px solid #e2e8f0; padding-top: 8px;
    font-size: 7pt; color: #94a3b8;
    display: flex; justify-content: space-between; margin-top: 16px;
  }}
</style>
</head>
<body>

  <div class="header">
    <div>{logo_html}</div>
    <div>
      <div class="doc-title">Field Sheet</div>
      <div class="doc-meta">
        Plan # <strong style="color:#1e293b">{plan.plan_number}</strong><br>
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
      <div class="info-sub">Code: {plan.project.code} &nbsp;·&nbsp; Zones: {plan.number_of_zones}</div>
    </div>
  </div>

  {house_sections}

  <!-- Notes + signature always start on a fresh page -->
  <div style="page-break-before:always">

  <!-- Notes box -->
  <div style="margin-bottom:24px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
    <div style="padding:8px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0">
      <span style="font-size:7.5pt;font-weight:700;text-transform:uppercase;
        letter-spacing:0.06em;color:#94a3b8">Field Notes</span>
    </div>
    <div style="padding:12px 14px;min-height:72px;font-size:8.5pt;color:#94a3b8">
      {plan.notes if plan.notes else '&nbsp;'}
    </div>
  </div>

  <!-- Signature block -->
  <div style="display:grid;grid-template-columns:2fr 1fr;gap:32px;margin-top:8px">
    <div>
      <div style="font-size:7.5pt;font-weight:700;text-transform:uppercase;
        letter-spacing:0.06em;color:#94a3b8;margin-bottom:28px">Foreman Signature</div>
      <div style="border-bottom:1.5px solid #475569"></div>
      <div style="font-size:7.5pt;color:#94a3b8;margin-top:4px">Signature</div>
    </div>
    <div>
      <div style="font-size:7.5pt;font-weight:700;text-transform:uppercase;
        letter-spacing:0.06em;color:#94a3b8;margin-bottom:28px">Date Completed</div>
      <div style="border-bottom:1.5px solid #475569"></div>
      <div style="font-size:7.5pt;color:#94a3b8;margin-top:4px">Date</div>
    </div>
  </div>

  <div class="footer">
    <span>{co["name"]} · Field Sheet · Plan # {plan.plan_number}</span>
    <span>Generated {now}</span>
  </div>

  </div><!-- end page-break wrapper -->

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


# ── Top Sheet ─────────────────────────────────────────────────────────────────

# Labor rate constants (2019 — configurable later)
LABOR_RATE_PER_HOUR = 76.73        # fully loaded labor cost per hour
OVERHEAD_PCT        = 0.15         # overhead applied to direct cost
BACKCHARGE_PCT      = 0.01         # typical backcharge allowance
PROD_OH_PCT         = 0.74         # production overhead
MARKUP_TARGET       = 1.30         # suggested price = direct cost × markup

# Phase definitions: (code, label, labor_hours_pct_of_total)
# Hours are estimated as a % of total bid value / labor rate
# These approximate the phase breakdown from the job cost sheet
PHASES = [
    ("R/I",    "Rough-In",            0.42),
    ("INDUN",  "Indoor Unit",         0.09),
    ("OUTUN",  "Outdoor Unit",        0.08),
    ("REGIS",  "Registers & Grills",  0.05),
    ("START",  "Startup & Balance",   0.06),
    ("LINES",  "Line Sets & Piping",  0.15),
    ("FINAL",  "Final / Inspection",  0.05),
    ("OTHER",  "Other / Misc",        0.10),
]


def build_top_sheet_html(plan, db=None) -> str:
    from models.models import KitVariant as KV
    co  = _get_company(db)
    now = datetime.datetime.now().strftime("%B %d, %Y")

    # ── Collect all line items ────────────────────────────────────────────────
    all_li = [
        li for ht in plan.house_types
        for sys in ht.systems
        for li in sys.line_items
    ]

    # ── Bid total = what builder is charged ───────────────────────────────────
    bid_total = sum(float(li.quantity) * float(li.unit_price) for li in all_li)

    # ── Identify embedded-margin items via part_number → kit variant lookup ──
    # Kit picker stores variant_code in part_number field
    part_numbers = [li.part_number for li in all_li if li.part_number]
    kit_map = {}  # variant_code → markup_divisor
    if part_numbers and db:
        variants = db.query(KV).filter(KV.variant_code.in_(part_numbers)).all()
        kit_map = {v.variant_code: float(v.markup_divisor) for v in variants}

    # Split bid total into: items with embedded margin vs. straight material
    embedded_revenue = 0.0  # bid value of items with divisor < 1.0
    embedded_cost    = 0.0  # internal cost of those same items
    material_revenue = 0.0  # bid value of straight material/component items

    for li in all_li:
        ext = float(li.quantity) * float(li.unit_price)
        divisor = kit_map.get(li.part_number, 1.0) if li.part_number else 1.0
        if divisor < 1.0:
            embedded_revenue += ext
            embedded_cost    += ext * divisor
        else:
            material_revenue += ext

    embedded_margin = embedded_revenue - embedded_cost

    # ── Estimate field labor on the straight-material portion ─────────────────
    estimated_hours_total = round(material_revenue / LABOR_RATE_PER_HOUR * 0.35, 1)
    labor_cost = estimated_hours_total * LABOR_RATE_PER_HOUR

    # ── Total internal cost structure ─────────────────────────────────────────
    direct_cost  = material_revenue + embedded_cost + labor_cost
    overhead     = direct_cost * OVERHEAD_PCT
    backcharges  = direct_cost * BACKCHARGE_PCT
    prod_oh      = direct_cost * PROD_OH_PCT
    misc_costs   = overhead + backcharges + prod_oh
    total_cost   = direct_cost + misc_costs
    suggested    = total_cost * MARKUP_TARGET
    selling      = bid_total
    profit       = selling - total_cost
    gross_profit = (profit / selling * 100) if selling else 0

    # Phase breakdown rows
    phase_rows_html = ""
    for code, label, pct in PHASES:
        ph_hours    = round(estimated_hours_total * pct, 2)
        ph_labor    = round(ph_hours * LABOR_RATE_PER_HOUR, 2)
        ph_material = round(material_cost * pct, 2)
        ph_other    = 0.0
        ph_total    = round(ph_labor + ph_material + ph_other, 2)
        phase_rows_html += f"""
        <tr>
          <td class="ph">{code}</td>
          <td class="ph">{label}</td>
          <td class="num">{ph_hours:.2f}</td>
          <td class="num">${ph_labor:,.2f}</td>
          <td class="num">${ph_material:,.2f}</td>
          <td class="num">—</td>
          <td class="num bold">${ph_total:,.2f}</td>
        </tr>"""

    delta_color = "#16a34a" if profit >= 0 else "#dc2626"

    return f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111;
          padding: 24px 32px; }}
  h1 {{ font-size: 18px; text-align: center; margin-bottom: 2px; }}
  .subtitle {{ text-align: center; font-size: 12px; color: #555; margin-bottom: 14px; }}
  .meta {{ display: flex; justify-content: space-between; margin-bottom: 14px;
           border: 1px solid #ccc; padding: 8px 12px; font-size: 11px; }}
  .meta div {{ line-height: 1.7; }}
  table {{ width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px; }}
  th {{ background: #1e3a5f; color: white; padding: 5px 8px; text-align: left; font-size: 10px; }}
  th.num {{ text-align: right; }}
  td {{ padding: 4px 8px; border-bottom: 1px solid #e5e7eb; }}
  td.num {{ text-align: right; }}
  td.ph {{ color: #555; }}
  td.bold {{ font-weight: 700; }}
  tr.subtotal td {{ background: #f3f4f6; font-weight: 700; border-top: 2px solid #1e3a5f; }}
  .two-col {{ display: flex; gap: 24px; margin-bottom: 14px; }}
  .box {{ flex: 1; border: 1px solid #ccc; padding: 10px 14px; }}
  .box h3 {{ font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;
             color: #555; margin-bottom: 8px; }}
  .kv {{ display: flex; justify-content: space-between; padding: 3px 0;
         border-bottom: 1px solid #f0f0f0; font-size: 11px; }}
  .kv:last-child {{ border-bottom: none; }}
  .kv .val {{ font-weight: 600; }}
  .highlight {{ background: #fffbeb; }}
  .profit-positive {{ color: #16a34a; font-size: 14px; font-weight: 700; }}
  .profit-negative {{ color: #dc2626; font-size: 14px; font-weight: 700; }}
  .footer {{ font-size: 9px; color: #aaa; text-align: center; margin-top: 20px;
             border-top: 1px solid #eee; padding-top: 8px; }}
  .warn {{ background: #fef3c7; border: 1px solid #fde68a; padding: 6px 10px;
           font-size: 10px; color: #92400e; margin-bottom: 12px; border-radius: 4px; }}
</style>
</head><body>

  <h1>{co["name"]}</h1>
  <div class="subtitle">Job Cost Estimate &amp; Top Sheet</div>

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
  </div>

  <div class="warn">
    ⚠ Labor hours are estimated from bid value. Actual hours should be verified
    against field records. Material cost reflects quoted line items.
  </div>

  <!-- Phase breakdown -->
  <table>
    <thead>
      <tr>
        <th>Phase</th><th>Description</th>
        <th class="num">Hours</th><th class="num">$ Labor</th>
        <th class="num">$ Material</th><th class="num">$ Other</th>
        <th class="num">$ Total</th>
      </tr>
    </thead>
    <tbody>
      {phase_rows_html}
      <tr class="subtotal">
        <td colspan="2">Sub Total</td>
        <td class="num">{estimated_hours_total:.2f}</td>
        <td class="num">${labor_cost:,.2f}</td>
        <td class="num">${material_revenue:,.2f}</td>
        <td class="num">—</td>
        <td class="num">${direct_cost:,.2f}</td>
      </tr>
    </tbody>
  </table>

  <div class="two-col">
    <!-- Cost structure -->
    <div class="box">
      <h3>Cost Structure</h3>
      <div class="kv"><span>Material / Component Cost</span><span class="val">${material_revenue:,.2f}</span></div>
      {'<div class="kv"><span>Kit Items w/ Embedded Margin (cost portion)</span><span class="val">$' + f'{embedded_cost:,.2f}' + '</span></div>' if embedded_cost > 0 else ''}
      <div class="kv"><span>Estimated Field Labor ({estimated_hours_total:.1f} hrs @ ${LABOR_RATE_PER_HOUR:.2f}/hr)</span>
                      <span class="val">${labor_cost:,.2f}</span></div>
      <div class="kv"><span>Production O/H ({PROD_OH_PCT*100:.0f}%)</span>
                      <span class="val">${prod_oh:,.2f}</span></div>
      <div class="kv"><span>Backcharges ({BACKCHARGE_PCT*100:.0f}%)</span>
                      <span class="val">${backcharges:,.2f}</span></div>
      <div class="kv"><span>Overhead ({OVERHEAD_PCT*100:.0f}%)</span>
                      <span class="val">${overhead:,.2f}</span></div>
      <div class="kv" style="border-top:2px solid #1e3a5f; margin-top:4px; padding-top:6px;">
        <span><strong>Total Internal Cost</strong></span>
        <span class="val"><strong>${total_cost:,.2f}</strong></span>
      </div>
    </div>

    <!-- Margin summary -->
    <div class="box">
      <h3>Margin Summary</h3>
      <div class="kv"><span>Total Direct Cost</span><span class="val">${direct_cost:,.2f}</span></div>
      {'<div class="kv"><span>Kit Embedded Margin</span><span class="val" style="color:#16a34a">+$' + f'{embedded_margin:,.2f}' + '</span></div>' if embedded_margin > 0 else ''}
      <div class="kv highlight"><span>Suggested Price ({MARKUP_TARGET*100-100:.0f}% markup)</span>
                      <span class="val">${suggested:,.2f}</span></div>
      <div class="kv"><span><strong>Selling Price (quoted)</strong></span>
                      <span class="val"><strong>${selling:,.2f}</strong></span></div>
      <div class="kv" style="border-top:2px solid #1e3a5f; margin-top:4px; padding-top:6px;">
        <span><strong>Gross Profit</strong></span>
        <span class="val {'profit-positive' if profit >= 0 else 'profit-negative'}">${profit:,.2f}</span>
      </div>
      <div class="kv">
        <span><strong>Gross Profit %</strong></span>
        <span class="val {'profit-positive' if profit >= 0 else 'profit-negative'}">{gross_profit:.1f}%</span>
      </div>
    </div>
  </div>

  <!-- House type breakdown -->
  <table>
    <thead>
      <tr>
        <th>House Type</th><th>House #</th>
        <th class="num">Line Items</th><th class="num">Bid Total</th>
      </tr>
    </thead>
    <tbody>
      {"".join(
        f'<tr><td>{ht.name}</td><td>{ht.house_number}</td>'
        f'<td class="num">{sum(len(s.line_items) for s in ht.systems)}</td>'
        f'<td class="num bold">${sum(float(li.quantity)*float(li.unit_price) for s in ht.systems for li in s.line_items):,.2f}</td></tr>'
        for ht in plan.house_types
      )}
    </tbody>
  </table>

  <div class="footer">
    {co["name"]} &middot; Plan # {plan.plan_number} &middot; {plan.estimator_name}
    &middot; Generated {now} &middot; Internal use only — not for distribution
  </div>
</body></html>"""


@router.post("/{plan_id}/top-sheet/generate")
def generate_top_sheet(plan_id: int, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    plan = db.query(Plan).options(
        joinedload(Plan.project).joinedload(Project.builder),
        joinedload(Plan.house_types).joinedload(HouseType.systems).joinedload(System.line_items),
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
