"""
WHMetcalfe Bid System — installer helper
Called by the Inno Setup installer after files are extracted.

Usage:
  setup_helper.py init   <install_dir> <db_pass> <admin_pass> <port> <smtp_host> <smtp_user> <smtp_pass>
  setup_helper.py upgrade <install_dir>
"""

import sys
import os
import subprocess
import secrets
import time

def pg(install_dir):
    return os.path.join(install_dir, "pgsql", "bin")

def pgdata(install_dir):
    return os.path.join(install_dir, "data", "pgdata")

def run(cmd, cwd=None, env=None):
    result = subprocess.run(cmd, cwd=cwd, env=env,
                            capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Command failed: {' '.join(cmd)}\n{result.stderr}")
    return result.stdout

def wait_for_pg(install_dir, timeout=30):
    pg_bin = pg(install_dir)
    data   = pgdata(install_dir)
    for _ in range(timeout):
        try:
            run([os.path.join(pg_bin, "pg_isready"), "-h", "127.0.0.1", "-p", "5433"])
            return True
        except Exception:
            time.sleep(1)
    return False

def init(install_dir, db_pass, admin_pass, port, smtp_host, smtp_user, smtp_pass):
    pg_bin  = pg(install_dir)
    data    = pgdata(install_dir)
    python  = os.path.join(install_dir, "python", "python.exe")
    backend = os.path.join(install_dir, "backend")

    os.makedirs(data, exist_ok=True)
    os.makedirs(os.path.join(install_dir, "data", "storage"), exist_ok=True)
    os.makedirs(os.path.join(install_dir, "data", "backups"), exist_ok=True)

    # --- 1. Init PostgreSQL data directory ---
    print("Initialising database...")
    pwfile = os.path.join(install_dir, "data", "pgpw.tmp")
    with open(pwfile, "w") as f:
        f.write(db_pass)

    run([
        os.path.join(pg_bin, "initdb"),
        "-D", data,
        "--username=postgres",
        f"--pwfile={pwfile}",
        "--encoding=UTF8",
        "--locale=C",
    ])
    os.remove(pwfile)

    # Use port 5433 internally to avoid clashing with any existing PG install
    pg_conf = os.path.join(data, "postgresql.conf")
    with open(pg_conf, "a") as f:
        f.write("\nport = 5433\nlisten_addresses = '127.0.0.1'\n")

    # --- 2. Start PostgreSQL temporarily ---
    print("Starting PostgreSQL...")
    env = os.environ.copy()
    pg_proc = subprocess.Popen([
        os.path.join(pg_bin, "pg_ctl"), "start",
        "-D", data, "-w", "-l", os.path.join(install_dir, "data", "pg.log"),
    ], env=env)
    pg_proc.wait()

    if not wait_for_pg(install_dir):
        raise RuntimeError("PostgreSQL did not start in time. Check data/pg.log.")

    # --- 3. Create application database ---
    print("Creating database...")
    pg_env = env.copy()
    pg_env["PGPASSWORD"] = db_pass
    run([
        os.path.join(pg_bin, "createdb"),
        "-h", "127.0.0.1", "-p", "5433",
        "-U", "postgres", "hvac"
    ], env=pg_env)

    # --- 4. Write .env ---
    print("Writing configuration...")
    secret_key = secrets.token_hex(32)
    db_url     = f"postgresql://postgres:{db_pass}@127.0.0.1:5433/hvac"
    smtp_block = ""
    if smtp_host:
        smtp_block = (
            f"\nSMTP_HOST={smtp_host}"
            f"\nSMTP_USER={smtp_user}"
            f"\nSMTP_PASS={smtp_pass}"
            f"\nSMTP_FROM={smtp_user}"
        )
    env_content = (
        f"DATABASE_URL={db_url}\n"
        f"SECRET_KEY={secret_key}\n"
        f"ADMIN_PASSWORD={admin_pass}\n"
        f"PORT={port}\n"
        f"STORAGE_PATH={os.path.join(install_dir, 'data', 'storage')}\n"
        f"ALLOWED_ORIGINS=http://localhost:{port}\n"
        f"{smtp_block}\n"
    )
    with open(os.path.join(backend, ".env"), "w", encoding="utf-8") as f:
        f.write(env_content)

    # --- 5. Run migrations / create tables ---
    print("Running database migrations...")
    be_env = env.copy()
    be_env["DATABASE_URL"] = db_url
    run([python, "-c",
         "import sys; sys.path.insert(0, '.'); "
         "from core.database import engine, Base; "
         "from models.models import *; "  # noqa
         "Base.metadata.create_all(bind=engine)"],
        cwd=backend, env=be_env)

    # --- 6. Register NSSM service ---
    print("Registering Windows service...")
    nssm    = os.path.join(install_dir, "nssm", "nssm.exe")
    uvicorn = os.path.join(install_dir, "python", "Scripts", "uvicorn.exe")
    subprocess.run([nssm, "install", "WHMetcalfe-BidSystem", uvicorn,
                    f"main:app --host 0.0.0.0 --port {port}"],
                   cwd=backend, capture_output=True)
    subprocess.run([nssm, "set", "WHMetcalfe-BidSystem", "AppDirectory", backend],
                   capture_output=True)
    subprocess.run([nssm, "set", "WHMetcalfe-BidSystem", "AppEnvironmentExtra",
                    f"DATABASE_URL={db_url}"],
                   capture_output=True)
    subprocess.run([nssm, "set", "WHMetcalfe-BidSystem", "Start", "SERVICE_AUTO_START"],
                   capture_output=True)

    # Register PG as a service too
    subprocess.run([nssm, "install", "WHMetcalfe-PostgreSQL",
                    os.path.join(pg_bin, "pg_ctl.exe"),
                    f'runservice -D "{data}"'],
                   capture_output=True)
    subprocess.run([nssm, "set", "WHMetcalfe-PostgreSQL", "Start", "SERVICE_AUTO_START"],
                   capture_output=True)

    # Start both services
    subprocess.run(["sc", "start", "WHMetcalfe-PostgreSQL"], capture_output=True)
    time.sleep(3)
    subprocess.run(["sc", "start", "WHMetcalfe-BidSystem"], capture_output=True)

    print("Installation complete.")


def upgrade(install_dir):
    """Stop service, files already replaced by installer, restart."""
    print("Stopping service for upgrade...")
    subprocess.run(["sc", "stop", "WHMetcalfe-BidSystem"], capture_output=True)
    time.sleep(3)
    subprocess.run(["sc", "start", "WHMetcalfe-BidSystem"], capture_output=True)
    print("Upgrade complete.")


if __name__ == "__main__":
    mode = sys.argv[1]
    if mode == "init":
        install_dir, db_pass, admin_pass, port, smtp_host, smtp_user, smtp_pass = sys.argv[2:9]
        init(install_dir, db_pass, admin_pass, port, smtp_host, smtp_user, smtp_pass)
    elif mode == "upgrade":
        upgrade(sys.argv[2])
    else:
        print(f"Unknown mode: {mode}", file=sys.stderr)
        sys.exit(1)
