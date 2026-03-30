from sqlalchemy import (
    Column, Integer, String, Numeric, Boolean,
    DateTime, Date, Text, ForeignKey, SmallInteger, func
)
from sqlalchemy.orm import relationship
from core.database import Base


class Builder(Base):
    __tablename__ = "builders"
    id            = Column(Integer, primary_key=True)
    code          = Column(String(10), unique=True, nullable=False)
    name          = Column(String(100), nullable=False)
    contact_name  = Column(String(100))
    office_phone  = Column(String(20))
    cell_phone    = Column(String(20))
    fax           = Column(String(20))
    email         = Column(String(200))
    address       = Column(String(200))
    city          = Column(String(100))
    state         = Column(String(2))
    zip_code      = Column(String(15))
    active        = Column(Boolean, default=True)
    projects      = relationship("Project", back_populates="builder")


class County(Base):
    __tablename__ = "counties"
    id                   = Column(Integer, primary_key=True)
    code                 = Column(String(6), unique=True, nullable=False)
    name                 = Column(String(100), nullable=False)
    state                = Column(String(2), nullable=False)
    permit_fee_notes     = Column(Text)
    mech_permit_required = Column(Text)
    inspection_notes     = Column(Text)


class Project(Base):
    __tablename__ = "projects"
    id         = Column(Integer, primary_key=True)
    code       = Column(String(10), unique=True, nullable=False)
    name       = Column(String(100), nullable=False)
    builder_id = Column(Integer, ForeignKey("builders.id"), nullable=False)
    county_id  = Column(Integer, ForeignKey("counties.id"))
    active     = Column(Boolean, default=True)
    builder    = relationship("Builder", back_populates="projects")
    county     = relationship("County")
    plans      = relationship("Plan", back_populates="project")


class EquipmentManufacturer(Base):
    __tablename__ = "equipment_manufacturers"
    id      = Column(Integer, primary_key=True)
    code    = Column(String(20), unique=True, nullable=False)
    name    = Column(String(100), nullable=False)
    systems = relationship("EquipmentSystem", back_populates="manufacturer")


class EquipmentSystem(Base):
    __tablename__ = "equipment_systems"
    id               = Column(Integer, primary_key=True)
    manufacturer_id  = Column(Integer, ForeignKey("equipment_manufacturers.id"), nullable=False, index=True)
    system_code      = Column(String(40), nullable=False)
    description      = Column(Text, nullable=False)
    component_cost   = Column(Numeric(10, 2), nullable=False)
    bid_price        = Column(Numeric(10, 2), nullable=False)
    effective_date   = Column(Date, nullable=False)
    retired_date     = Column(Date, index=True)
    manufacturer     = relationship("EquipmentManufacturer", back_populates="systems")
    components       = relationship("EquipmentComponent", back_populates="system",
                                    cascade="all, delete-orphan", order_by="EquipmentComponent.sort_order")


class EquipmentComponent(Base):
    __tablename__ = "equipment_components"
    id             = Column(Integer, primary_key=True)
    system_id      = Column(Integer, ForeignKey("equipment_systems.id"), nullable=False, index=True)
    sort_order     = Column(Integer, nullable=False, default=0)
    component_type = Column(String(60), nullable=False)   # "Furnace", "Coil", "Condenser", etc.
    model_number   = Column(String(100))
    cost           = Column(Numeric(10, 2))
    system         = relationship("EquipmentSystem", back_populates="components")


class Plan(Base):
    __tablename__ = "plans"
    id                 = Column(Integer, primary_key=True)
    plan_number        = Column(String(12), unique=True, nullable=False)
    estimator_name     = Column(String(100), nullable=False)
    estimator_initials = Column(String(3), nullable=False, index=True)
    project_id         = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    status             = Column(String(20), default="draft", index=True)
    number_of_zones    = Column(SmallInteger, default=1)
    house_type         = Column(String(100))
    notes              = Column(Text)
    contracted_at      = Column(DateTime, index=True)
    created_at         = Column(DateTime, server_default=func.now(), index=True)
    updated_at         = Column(DateTime, server_default=func.now(), onupdate=func.now())
    project            = relationship("Project", back_populates="plans")
    house_types        = relationship("HouseType", back_populates="plan", cascade="all, delete-orphan")
    documents          = relationship("Document", back_populates="plan", cascade="all, delete-orphan")


class HouseType(Base):
    __tablename__ = "house_types"
    id              = Column(Integer, primary_key=True)
    plan_id         = Column(Integer, ForeignKey("plans.id"), nullable=False)
    house_number    = Column(String(2), default="01")
    name            = Column(String(100), nullable=False)
    bid_hours       = Column(Numeric(6, 2))
    pwk_sheet_metal = Column(Numeric(10, 2))
    total_bid       = Column(Numeric(10, 2))
    notes           = Column(Text)
    plan            = relationship("Plan", back_populates="house_types")
    systems         = relationship("System", back_populates="house_type", cascade="all, delete-orphan")
    draws           = relationship("Draw", back_populates="house_type", cascade="all, delete-orphan")


class System(Base):
    __tablename__ = "systems"
    id                  = Column(Integer, primary_key=True)
    house_type_id       = Column(Integer, ForeignKey("house_types.id"), nullable=False)
    system_number       = Column(String(2), default="01")
    zone_label          = Column(String(50))
    equipment_system_id = Column(Integer, ForeignKey("equipment_systems.id"))
    notes               = Column(Text)
    house_type          = relationship("HouseType", back_populates="systems")
    equipment_system    = relationship("EquipmentSystem")
    line_items          = relationship("LineItem", back_populates="system", cascade="all, delete-orphan")


class LineItem(Base):
    __tablename__ = "line_items"
    id           = Column(Integer, primary_key=True)
    system_id    = Column(Integer, ForeignKey("systems.id"), nullable=False)
    sort_order   = Column(String(10), nullable=False)
    pricing_flag = Column(String(10), default="standard")
    description  = Column(Text, nullable=False)
    quantity     = Column(Numeric(8, 2), default=1)
    unit_price   = Column(Numeric(10, 2), default=0)
    pwk_price    = Column(Numeric(10, 2))
    draw_stage   = Column(String(20))
    part_number  = Column(String(40))
    notes        = Column(Text)
    system       = relationship("System", back_populates="line_items")


class Draw(Base):
    __tablename__ = "draws"
    id            = Column(Integer, primary_key=True)
    house_type_id = Column(Integer, ForeignKey("house_types.id"), nullable=False)
    stage         = Column(String(20), nullable=False)
    amount        = Column(Numeric(10, 2), nullable=False)
    draw_number   = Column(SmallInteger, nullable=False)
    house_type    = relationship("HouseType", back_populates="draws")


class Document(Base):
    __tablename__ = "documents"
    id           = Column(Integer, primary_key=True)
    plan_id      = Column(Integer, ForeignKey("plans.id"), nullable=False, index=True)
    doc_type     = Column(String(30), nullable=False, index=True)
    storage_path = Column(String(500))
    generated_at = Column(DateTime, server_default=func.now())
    notes        = Column(Text)
    plan         = relationship("Plan", back_populates="documents")


class EventLog(Base):
    __tablename__ = "event_log"
    id          = Column(Integer, primary_key=True)
    event_at    = Column(DateTime, server_default=func.now())
    username    = Column(String(50))
    plan_id     = Column(Integer, ForeignKey("plans.id"))
    event_type  = Column(String(50))
    description = Column(Text, nullable=False)


class KitItem(Base):
    __tablename__ = "kit_items"
    id            = Column(Integer, primary_key=True)
    category      = Column(String(50), nullable=False)   # sheet_metal, flex_line, etc.
    description   = Column(String(200), nullable=False)
    base_price    = Column(Numeric(10, 2), nullable=False, default=0)
    price_per_ton = Column(Numeric(10, 2), nullable=False, default=0)
    unit          = Column(String(20), default="each")
    sort_order    = Column(Integer, default=10)
    active        = Column(Boolean, default=True)


class User(Base):
    __tablename__ = "users"
    id              = Column(Integer, primary_key=True)
    username        = Column(String(50), unique=True, nullable=False)
    full_name       = Column(String(100), nullable=False)
    initials        = Column(String(3), nullable=False, unique=True)
    email           = Column(String(200), unique=True)
    hashed_password = Column(String(200), nullable=False)
    role            = Column(String(20), nullable=False, default="account_manager")
    active          = Column(Boolean, default=True)
    created_at      = Column(DateTime, server_default=func.now())
    updated_at      = Column(DateTime, server_default=func.now(), onupdate=func.now())
