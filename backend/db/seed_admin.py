"""
Creates the initial admin user.
Run once after init_db.py:
    python db/seed_admin.py

Default credentials:
    username: admin
    password: ChangeMe123!

Change the password immediately after first login.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from core.database import engine, Base, SessionLocal
from core.security import hash_password
from models.models import User

Base.metadata.create_all(bind=engine)

def seed():
    db = SessionLocal()
    try:
        if db.query(User).filter_by(username="admin").first():
            print("Admin user already exists.")
            return
        admin = User(
            username="admin",
            full_name="Administrator",
            initials="AD",
            email="admin@metcalfe.com",
            hashed_password=hash_password("ChangeMe123!"),
            role="admin",
        )
        db.add(admin)
        db.commit()
        print("Admin user created.")
        print("  Username: admin")
        print("  Password: ChangeMe123!")
        print("  Change this password immediately after first login.")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
