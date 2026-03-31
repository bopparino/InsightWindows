# Server Deployment Guide
**WHMetcalfe HVAC Bid System — Self-Hosted on Windows Server**

This guide walks through a one-time install on the server PC.
After setup, updates are a single command.

---

## Prerequisites

Install these on the server PC before starting.

| Tool | Download |
|------|----------|
| Docker Desktop | https://www.docker.com/products/docker-desktop/ |
| Git | https://git-scm.com/download/win |
| cloudflared | https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/ |

After installing Docker Desktop, open it and make sure it shows **"Engine running"** before continuing.

---

## Part 1 — Get the Code

Open **PowerShell** and run:

```powershell
cd C:\
git clone https://github.com/bopparino/hvac-bid-system.git hvac-bids
cd hvac-bids
```

---

## Part 2 — Create Your Environment File

Copy the example and fill in your values:

```powershell
copy .env.example .env
notepad .env
```

Edit the following fields in `.env`:

```
POSTGRES_PASSWORD=   ← pick any strong password (e.g. Metcalfe2025!)
SECRET_KEY=          ← generate one (see below)
ADMIN_PASSWORD=      ← first-login password for the admin account
SMTP_PASSWORD=       ← your bids@whmetcalfe.com app password
```

**Generate a SECRET_KEY** (run this in PowerShell):
```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```
Paste the output into `.env` as the `SECRET_KEY` value.

Leave everything else as-is — the Azure SSO credentials and domain are already filled in.

---

## Part 3 — Build and Start the App

```powershell
docker compose up -d --build
```

This will:
1. Build the app image (takes ~3-5 minutes the first time)
2. Start the Postgres database
3. Start the app on port 8000

**Verify it's running:**
```powershell
docker compose ps
```
Both `app` and `db` should show `running`.

Open a browser on the server and go to `http://localhost:8000` — you should see the login page.

---

## Part 4 — Restore the Database

If migrating from Railway, export the data first:

```powershell
# On your dev machine — dump from Railway
pg_dump "postgresql://postgres:PASSWORD@hopper.proxy.rlwy.net:22330/railway" -F c -f hvac_backup.dump

# Copy hvac_backup.dump to the server, then restore into the local container
docker cp hvac_backup.dump hvac-bids-db-1:/tmp/backup.dump
docker exec hvac-bids-db-1 pg_restore -U postgres -d hvac --no-owner --no-privileges --data-only -F c /tmp/backup.dump
```

If starting fresh (no migration), skip this step — the app creates all tables automatically on first boot.

---

## Part 5 — Cloudflare Tunnel

This gives users a public `https://bids.metcalfehvac.com` URL with no open firewall ports.

### 5a. Add your domain to Cloudflare (if not already)

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Add a site** → enter `metcalfehvac.com`
2. Follow the prompts to update your domain's nameservers to Cloudflare's
3. Wait for DNS to propagate (usually under 30 minutes)

### 5b. Create the tunnel

```powershell
cloudflared tunnel login
cloudflared tunnel create hvac-bids
```

The second command prints a **Tunnel ID** — copy it.

### 5c. Configure the tunnel

Open `cloudflare-tunnel\config.yml` and replace the two placeholders:

```
tunnel: TUNNEL_ID_GOES_HERE        ← paste your Tunnel ID
credentials-file: C:\Users\YOUR_WINDOWS_USERNAME\.cloudflared\TUNNEL_ID_GOES_HERE.json
```

Replace `YOUR_WINDOWS_USERNAME` with your actual Windows username (e.g. `Austin`).

### 5d. Point the DNS at the tunnel

```powershell
cloudflared tunnel route dns hvac-bids bids.metcalfehvac.com
```

### 5e. Start the tunnel

```powershell
cloudflared tunnel --config cloudflare-tunnel\config.yml run hvac-bids
```

Test it: open `https://bids.metcalfehvac.com` from any device. You should see the login page over HTTPS.

### 5f. Run the tunnel automatically on startup

Install it as a Windows service so it starts with the PC:

```powershell
cloudflared service install
```

Then in Services (`services.msc`), set **Cloudflare Tunnel** to start automatically.

---

## Part 6 — Azure SSO Redirect URI

Add the production URL as a redirect URI in Azure so SSO works:

1. Go to [portal.azure.com](https://portal.azure.com) → **Entra ID** → **App registrations** → your app
2. Click **Authentication** → under **Single-page application**, click **Add URI**
3. Add: `https://bids.metcalfehvac.com/auth-redirect.html`
4. Click **Save**

---

## Updating the App

When a new version is pushed to GitHub:

```powershell
cd C:\hvac-bids
git pull
docker compose up -d --build
```

That's it. The database is preserved in a Docker volume — updates never touch your data.

---

## Useful Commands

```powershell
# View live logs
docker compose logs -f app

# Stop everything
docker compose down

# Restart the app only (without rebuilding)
docker compose restart app

# Open a database shell
docker exec -it hvac-bids-db-1 psql -U postgres -d hvac
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Login page doesn't load | Run `docker compose ps` — check both services are `running` |
| Azure SSO button missing | Check `AZURE_CLIENT_ID` is set in `.env` and the image was rebuilt with `--build` |
| Azure SSO redirect fails | Make sure `https://bids.metcalfehvac.com/auth-redirect.html` is added in Azure portal |
| Tunnel not connecting | Run `cloudflared tunnel --config cloudflare-tunnel\config.yml run hvac-bids` manually and check the output |
| Database empty after update | Data lives in Docker volumes — only lost if you run `docker compose down -v` (the `-v` flag removes volumes) |
