"""
Run once to create all tables.
Usage: python db/init_db.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from core.database import engine, Base
from models.models import (  # noqa — registers all models with Base
    Builder, County, Project, EquipmentManufacturer,
    EquipmentSystem, Plan, HouseType, System,
    LineItem, Draw, Document, EventLog
)


def init():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("All tables created.")


if __name__ == "__main__":
    init()
