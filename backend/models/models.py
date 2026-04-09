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
    includes           = Column(Text)
    excludes           = Column(Text)
    is_template        = Column(Boolean, default=False, nullable=False)
    factor             = Column(Numeric(5, 4), default=0.69, nullable=False)
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
    labor_hrs           = Column(Numeric(6, 2), default=0, nullable=False)
    service_qty         = Column(Integer, default=0, nullable=False)
    permit_yn           = Column(Boolean, default=False, nullable=False)
    sales_tax_pct       = Column(Numeric(5, 4), default=0.06, nullable=False)
    house_type          = relationship("HouseType", back_populates="systems")
    equipment_system    = relationship("EquipmentSystem")
    line_items          = relationship("LineItem", back_populates="system", cascade="all, delete-orphan")


class LineItem(Base):
    __tablename__ = "line_items"
    id              = Column(Integer, primary_key=True)
    system_id       = Column(Integer, ForeignKey("systems.id"), nullable=False)
    sort_order      = Column(String(10), nullable=False)
    pricing_flag    = Column(String(10), default="standard")
    description     = Column(Text, nullable=False)
    quantity        = Column(Numeric(8, 2), default=1)
    unit_price      = Column(Numeric(10, 2), default=0)
    pwk_price       = Column(Numeric(10, 2))
    draw_stage      = Column(String(20))
    part_number     = Column(String(40))
    notes           = Column(Text)
    kit_variant_id  = Column(Integer, ForeignKey("kit_variants.id"), nullable=True)
    system          = relationship("System", back_populates="line_items")
    kit_variant     = relationship("KitVariant")
    components      = relationship("LineItemComponent", back_populates="line_item",
                                   cascade="all, delete-orphan", order_by="LineItemComponent.sort_order")


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
    version      = Column(Integer, nullable=False, default=1)
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
    category      = Column(String(50), nullable=False)
    description   = Column(String(200), nullable=False)
    base_price    = Column(Numeric(10, 2), nullable=False, default=0)
    price_per_ton = Column(Numeric(10, 2), nullable=False, default=0)
    unit          = Column(String(20), default="each")
    sort_order    = Column(Integer, default=10)
    active        = Column(Boolean, default=True)


class KitVariant(Base):
    """
    New kit pricing structure based on the 2019 Kit Prices workbook.
    Each row = one selectable kit option (e.g. '4" Sheet Metal Run').
    per_kit  = flat cost for one kit/run
    per_foot = additional footage cost (0 if not applicable)
    """
    __tablename__ = "kit_variants"
    id              = Column(Integer, primary_key=True)
    category_code   = Column(String(4),   nullable=False, index=True)  # A, B, C … T
    category_name   = Column(String(100), nullable=False)
    variant_code    = Column(String(40),  nullable=False)              # 4" SMR, PVC2X21DP, etc.
    variant_name    = Column(String(200), nullable=False)
    per_kit         = Column(Numeric(10, 4), nullable=False, default=0)
    per_foot        = Column(Numeric(10, 4), nullable=False, default=0)
    markup_divisor  = Column(Numeric(5, 4),  nullable=False, default=1.0)  # selling = per_kit; cost = per_kit * divisor
    sort_order      = Column(Integer, default=10)
    active          = Column(Boolean, default=True)
    kit_components  = relationship("KitComponent", back_populates="kit_variant",
                                   cascade="all, delete-orphan", order_by="KitComponent.sort_order")


class KitComponent(Base):
    """
    Template component definition for a KitVariant.
    Defines what parts get snapshotted into a bid when this kit is selected.
    """
    __tablename__ = "kit_components"
    id             = Column(Integer, primary_key=True)
    kit_variant_id = Column(Integer, ForeignKey("kit_variants.id"), nullable=False, index=True)
    sort_order     = Column(Integer, nullable=False, default=10)
    description    = Column(String(200), nullable=False)
    part_number    = Column(String(60))
    quantity       = Column(Numeric(8, 3), nullable=False, default=1)
    unit_cost      = Column(Numeric(10, 4), nullable=False, default=0)
    kit_variant    = relationship("KitVariant", back_populates="kit_components")


class LineItemComponent(Base):
    """
    Snapshotted component on a specific bid line item (kit instance).
    Estimators can edit quantity or mark excluded without touching the template.
    """
    __tablename__ = "line_item_components"
    id                = Column(Integer, primary_key=True)
    line_item_id      = Column(Integer, ForeignKey("line_items.id"), nullable=False, index=True)
    kit_component_id  = Column(Integer, ForeignKey("kit_components.id"), nullable=True)  # back-ref to template
    sort_order        = Column(Integer, nullable=False, default=10)
    description       = Column(String(200), nullable=False)
    part_number       = Column(String(60))
    quantity          = Column(Numeric(8, 3), nullable=False, default=1)
    unit_cost         = Column(Numeric(10, 4), nullable=False, default=0)
    excluded          = Column(Boolean, nullable=False, default=False)  # soft-remove ("we have stock")
    line_item         = relationship("LineItem", back_populates="components")
    kit_component     = relationship("KitComponent")


class Suggestion(Base):
    __tablename__ = "suggestions"
    id           = Column(Integer, primary_key=True)
    submitted_at = Column(DateTime, server_default=func.now())
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_name    = Column(String(100), nullable=False)
    type         = Column(String(20), nullable=False, default="feedback")
    subject      = Column(String(200), nullable=False)
    message      = Column(Text, nullable=False)
    status       = Column(String(20), default="open")


class CompanySettings(Base):
    """Single-row table holding branding/company info editable from the UI."""
    __tablename__ = "company_settings"
    id           = Column(Integer, primary_key=True)
    company_name = Column(String(100), nullable=False, default="Metcalfe Heating & Air Conditioning")
    phone        = Column(String(30))
    email        = Column(String(200))
    address      = Column(String(200))
    city         = Column(String(100))
    state        = Column(String(2))
    zip_code     = Column(String(15))
    website      = Column(String(200))
    quote_footer = Column(Text)          # custom footer text on quotes
    logo_b64     = Column(Text)          # base64-encoded logo image
    updated_at   = Column(DateTime, server_default=func.now(), onupdate=func.now())


class PlanComment(Base):
    __tablename__ = "plan_comments"
    id         = Column(Integer, primary_key=True)
    plan_id    = Column(Integer, ForeignKey("plans.id"), nullable=False, index=True)
    username   = Column(String(50), nullable=False)
    full_name  = Column(String(100), nullable=False)
    body       = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class PlanTask(Base):
    __tablename__ = "plan_tasks"
    id           = Column(Integer, primary_key=True)
    plan_id      = Column(Integer, ForeignKey("plans.id"), nullable=False, index=True)
    title        = Column(String(200), nullable=False)
    done         = Column(Boolean, default=False, nullable=False)
    assigned_to  = Column(String(100))
    created_by   = Column(String(100), nullable=False)
    created_at   = Column(DateTime, server_default=func.now())


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
