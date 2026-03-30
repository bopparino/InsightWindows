# HVAC Bid System

Internal estimating tool for W.H. Metcalfe HVAC. Generates quotes, tracks plans by project/builder/estimator, and manages equipment pricing.

**Stack:** React 18 + Vite · FastAPI · PostgreSQL · WeasyPrint (PDF) · Microsoft Entra ID (SSO)

---

## Features

- Plan management — create, track, and generate quote PDFs per estimator
- Equipment catalog — manufacturer/system browser with bundle component breakdown
- Kit pricing — configurable add-on items (HEPA, UV lights, extended warranties, etc.)
- Performance dashboard — revenue and plan counts by estimator
- User management — admin / account executive / account manager roles
- Microsoft SSO — sign in with company Microsoft account via Entra ID
- Email — send quotes directly from the app via Microsoft 365 SMTP
- 6 color themes

---

## Requirements

| Software | Version | Notes |
|----------|---------|-------|
| Python | 3.8 – 3.12 | 3.8 required for Windows Server 2008 R2 |
| PostgreSQL | 12+ | 12.x for Windows Server 2008 R2 |
| Node.js | 18+ | Dev only — not needed on production server |

---

## Local Development Setup

### 1. Clone and configure

```cmd
git clone https://github.com/YOUR_ORG/hvac-bid-system.git
cd hvac-bid-system
```

Copy the example env files and fill in your values:

```cmd
copy .env.example .env
copy frontend\.env.example frontend\.env
```

Edit `.env` — at minimum set `DATABASE_URL`, `SECRET_KEY`, `ESTIMATOR_NAME`, and `ESTIMATOR_INITIALS`.

### 2. Create the database

```sql
CREATE DATABASE hvac_poc;
```

### 3. Python backend

```cmd
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python db/init_db.py
```

### 4. Frontend

```cmd
cd frontend
npm install
```

### 5. Run (two terminals)

**Backend:**
```cmd
cd backend && .venv\Scripts\activate && uvicorn main:app --reload --port 8000
```

**Frontend (dev):**
```cmd
cd frontend && npm run dev
```

Open http://localhost:5173

---

## Production Deployment (Windows Server + Cloudflare Tunnel)

### 1. Build the frontend

On your dev machine:
```cmd
cd frontend
npm run build        # produces frontend/dist/
```

Copy the entire project folder to the server. The `dist/` folder is served automatically by FastAPI — no web server or Node.js needed on the production machine.

### 2. Install dependencies on the server

```cmd
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure environment

Copy `.env.example` to `.env` and set production values:

```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/hvac_poc
ALLOWED_ORIGINS=https://bid.yourdomain.com
AZURE_CLIENT_ID=...
AZURE_TENANT_ID=...
```

### 4. Run as a Windows service (NSSM)

Download [NSSM](https://nssm.cc/), then:

```cmd
nssm install HVACBidSystem "C:\path\to\backend\.venv\Scripts\uvicorn.exe"
nssm set HVACBidSystem AppParameters "main:app --host 0.0.0.0 --port 8000"
nssm set HVACBidSystem AppDirectory "C:\path\to\backend"
nssm start HVACBidSystem
```

### 5. Cloudflare Tunnel

```cmd
cloudflared.exe tunnel login
cloudflared.exe tunnel create hvac-bid
cloudflared.exe tunnel route dns hvac-bid bid.yourdomain.com
```

Create `C:\cloudflared\config.yml`:
```yaml
tunnel: <tunnel-id>
credentials-file: C:\Users\<user>\.cloudflared\<tunnel-id>.json

ingress:
  - hostname: bid.yourdomain.com
    service: http://localhost:8000
  - service: http_status:404
```

Install as a service:
```cmd
cloudflared.exe service install
```

### 6. Azure App Registration — redirect URIs

Add the following in portal.azure.com → App Registrations → Authentication:
- `https://bid.yourdomain.com/auth-redirect.html`
- `http://localhost:5173/auth-redirect.html` (dev)

---

## Project Structure

```
├── .env.example              ← copy to .env and fill in secrets
├── backend/
│   ├── main.py               ← FastAPI app — also serves frontend/dist/
│   ├── requirements.txt
│   ├── core/
│   │   ├── config.py         ← reads .env via pydantic-settings
│   │   └── database.py       ← SQLAlchemy engine + session
│   ├── models/models.py      ← all ORM table definitions
│   ├── api/routes/           ← plans, equipment, auth, kit, documents, ...
│   ├── db/init_db.py         ← creates all tables on first run
│   └── scripts/
│       └── parse_equipment.py  ← imports equipment pricing from XLS files
├── frontend/
│   ├── .env.example          ← copy to .env and fill in VITE_AZURE_* vars
│   ├── auth-redirect.html    ← MSAL v5 popup redirect bridge page
│   ├── src/
│   │   ├── App.jsx           ← routing + sidebar nav
│   │   ├── api/client.js     ← axios API wrappers
│   │   ├── auth/msalConfig.js
│   │   └── pages/            ← Dashboard, Plans, Equipment, Login, ...
│   └── dist/                 ← built output (gitignored, served by FastAPI)
└── data/
    └── quotes/               ← generated PDFs (gitignored)
```

---

## Troubleshooting

**`could not connect to server`** — PostgreSQL service isn't running. Open Windows Services and start it.

**`password authentication failed`** — Update `DATABASE_URL` in `.env`.

**WeasyPrint produces HTML instead of PDF** — Install the GTK runtime for Windows:
https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer

**Microsoft SSO popup doesn't close** — Ensure `/auth-redirect.html` is registered as a redirect URI in your Azure App Registration.
