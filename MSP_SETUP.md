# HVAC Bid System — MSP Setup Guide

Internal estimating tool for W.H. Metcalfe HVAC. Staff log in, build plans, select equipment, and generate PDF quotes. Internal use only — no public-facing component.

Source code: https://github.com/bopparino/hvac-bid-system

---

## Stack Overview

| Layer | Technology | Notes |
|-------|-----------|-------|
| Backend | Python 3.8 / FastAPI | Runs as a Windows service on port 8000 |
| Frontend | React 18 | Compiled to static files, served by the backend |
| Database | PostgreSQL 12 | Local only, no external access needed |
| Auth | Username/password + Microsoft Entra SSO | SSO via company Microsoft accounts |
| PDF | WeasyPrint + GTK runtime | Required for quote generation |
| Tunnel | Cloudflare Tunnel | Exposes the app to the internet — no open ports needed |

---

## Server

**Windows Server 2008 R2.** WS2008 R2 is EOL but acceptable here because no ports are opened directly — all traffic flows through Cloudflare Tunnel — and access is limited to internal staff with Microsoft SSO.

---

## Why Cloudflare Tunnel

Instead of opening firewall ports or dealing with a dynamic IP, a small program (`cloudflared`) runs on the server and maintains an outbound encrypted connection to Cloudflare. When a user visits `bid.metcalfehvac.com`, the request routes through Cloudflare's edge down the tunnel to port 8000 on the server. Cloudflare handles SSL automatically.

**Requirements:** outbound internet access on port 443 (standard HTTPS — should already be open).

---

## Installation Checklist

### 1. Python 3.8.x
- Installer: https://www.python.org/downloads/release/python-3817/ (Windows 64-bit)
- Check **"Add Python to PATH"** during install
- Verify: `python --version`

### 2. PostgreSQL 12
- Installer: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads (version 12, Windows x86-64)
- Note the password set for the `postgres` user
- After install: open pgAdmin and create a database named `hvac_poc`

### 3. GTK Runtime (required for PDF generation)
- Installer: https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer/releases
- Install with default settings

### 4. NSSM (runs the app as a Windows service)
- Download: https://nssm.cc/download (64-bit exe, no install needed)
- Used to register the Python backend so it auto-starts with the server

### 5. The Application
- Transfer the project folder to the server, or clone from GitHub if Git is available
- Run Python setup to install dependencies (see README)
- Drop in the `.env` config file (Austin provides this — contains DB credentials, secret key, email config, Azure SSO IDs)

### 6. cloudflared (Cloudflare Tunnel)
- Download: https://github.com/cloudflare/cloudflared/releases/latest → `cloudflared-windows-amd64.exe`
- Place at `C:\cloudflared\cloudflared.exe`
- We'll run the tunnel setup together (requires Cloudflare account login):
  ```
  cloudflared.exe tunnel login
  cloudflared.exe tunnel create hvac-bid
  cloudflared.exe tunnel route dns hvac-bid bid.metcalfehvac.com
  ```
- Create `C:\cloudflared\config.yml`:
  ```yaml
  tunnel: <tunnel-id>
  credentials-file: C:\Users\<user>\.cloudflared\<tunnel-id>.json

  ingress:
    - hostname: bid.metcalfehvac.com
      service: http://localhost:8000
    - service: http_status:404
  ```
- Install as a Windows service:
  ```
  cloudflared.exe service install
  ```

---

## What Austin Handles After Setup

- DNS CNAME record for `bid.metcalfehvac.com`
- Azure App Registration update (adds production URL for Microsoft SSO)
- End-to-end testing
- Creating user accounts for the team
