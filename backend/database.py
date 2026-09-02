from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from config import DATABASE_URL

# Auto-detect SQLite vs PostgreSQL
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        connect_args={"connect_timeout": 10},
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Client(Base):
    """Each client/company that uses the platform"""
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(200))
    industry = Column(String(100))  # school, real_estate, insurance, etc.
    contact_name = Column(String(100))
    email = Column(String(100), unique=True)
    phone = Column(String(20))
    password = Column(String(200))  # hashed
    product_info = Column(Text)  # what they sell/offer
    ai_script = Column(Text)  # custom AI instructions
    ai_name = Column(String(50), default="Alex")  # AI caller name
    ai_tone = Column(String(20), default="friendly")  # friendly, professional, casual
    is_active = Column(Boolean, default=True)
    plan = Column(String(20), default="free")  # free, basic, pro
    total_calls = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class User(Base):
    """Team members under a client company"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    name = Column(String(100))
    email = Column(String(100), unique=True)
    password = Column(String(200))
    role = Column(String(20), default="agent")  # admin, manager, agent
    permissions = Column(Text, default="dashboard,leads,calls")  # comma-separated page access
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    name = Column(String(100))
    phone = Column(String(20))
    email = Column(String(100), nullable=True)
    company = Column(String(100), nullable=True)
    status = Column(String(20), default="new")
    score = Column(Integer, default=0)
    category = Column(String(10), default="cold")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CallLog(Base):
    __tablename__ = "call_logs"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    lead_id = Column(Integer)
    lead_name = Column(String(100))
    phone = Column(String(20))
    duration_seconds = Column(Integer, default=0)
    transcript = Column(Text, nullable=True)
    sentiment = Column(String(20))
    lead_score = Column(Integer, default=0)
    category = Column(String(10))
    summary = Column(Text, nullable=True)
    call_status = Column(String(20), default="completed")
    recording_url = Column(Text, nullable=True)   # Exotel recording MP3 link
    # Intelligence fields
    intent = Column(String(50), nullable=True)
    emotion = Column(String(50), nullable=True)
    buying_signals = Column(Text, nullable=True)   # JSON array
    objections = Column(Text, nullable=True)        # JSON array
    recommended_action = Column(Text, nullable=True)
    follow_up_urgency = Column(String(30), nullable=True)
    key_topics = Column(Text, nullable=True)        # JSON array
    direction = Column(String(10), default="outbound")  # inbound/outbound
    created_at = Column(DateTime, default=datetime.utcnow)


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    name = Column(String(100))
    script = Column(Text)
    product_info = Column(Text)
    is_active = Column(Boolean, default=True)
    total_calls = Column(Integer, default=0)
    hot_leads = Column(Integer, default=0)
    warm_leads = Column(Integer, default=0)
    cold_leads = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class AIEmployee(Base):
    __tablename__ = "ai_employees"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    name = Column(String(100))
    role = Column(String(100))
    industry = Column(String(100), default="")
    voice = Column(String(50), default="suhani")
    languages = Column(String(200), default="Telugu, English")
    language = Column(String(50), default="English")       # primary language
    gender = Column(String(20), default="Female")
    type = Column(String(20), default="outbound")          # outbound | inbound
    goal = Column(String(200), default="Lead Generation and Qualification")
    company_website = Column(String(200), default="")
    script_mode = Column(String(20), default="manual")     # manual | ai
    greeting = Column(Text, default="")
    script = Column(Text)
    company_name = Column(String(200), default="")
    company_info = Column(Text, default="")
    goals = Column(Text, default="")
    status = Column(String(20), default="active")
    total_calls = Column(Integer, default=0)
    leads_qualified = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class KnowledgeBase(Base):
    __tablename__ = "knowledge_base"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    title = Column(String(200))
    content = Column(Text)
    category = Column(String(50), default="general")
    created_at = Column(DateTime, default=datetime.utcnow)


class APIKey(Base):
    """API keys for developer/reseller access"""
    __tablename__ = "api_keys"
    id          = Column(Integer, primary_key=True, index=True)
    client_id   = Column(Integer, ForeignKey("clients.id"))
    name        = Column(String(100))           # e.g. "Production Key"
    key         = Column(String(100), unique=True, index=True)  # tzm_live_xxxx
    is_active   = Column(Boolean, default=True)
    calls_used  = Column(Integer, default=0)
    calls_limit = Column(Integer, default=1000) # per month
    last_used   = Column(DateTime, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)


class UsageLog(Base):
    """Per-call usage tracking for billing"""
    __tablename__ = "usage_logs"
    id         = Column(Integer, primary_key=True, index=True)
    client_id  = Column(Integer, ForeignKey("clients.id"))
    api_key_id = Column(Integer, nullable=True)
    endpoint   = Column(String(100))
    calls      = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)


class RazorpayOrder(Base):
    """Track Razorpay payment orders"""
    __tablename__ = "razorpay_orders"
    id           = Column(Integer, primary_key=True, index=True)
    client_id    = Column(Integer, ForeignKey("clients.id"))
    order_id     = Column(String(100), unique=True)  # Razorpay order_id
    plan         = Column(String(50))
    amount_inr   = Column(Float)
    status       = Column(String(20), default="created")  # created|paid|failed
    payment_id   = Column(String(100), nullable=True)
    created_at   = Column(DateTime, default=datetime.utcnow)


class Appointment(Base):
    __tablename__ = "appointments"
    id         = Column(Integer, primary_key=True, index=True)
    client_id  = Column(Integer, ForeignKey("clients.id"))
    lead_name  = Column(String(100))
    phone      = Column(String(20))
    date       = Column(String(30))
    time       = Column(String(20))
    agent      = Column(String(100), default="AI Agent")
    apt_type   = Column(String(30), default="callback")  # callback | demo | follow-up
    status     = Column(String(20), default="upcoming")  # upcoming | completed | cancelled
    notes      = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Wallet(Base):
    __tablename__ = "wallets"
    id          = Column(Integer, primary_key=True, index=True)
    client_id   = Column(Integer, ForeignKey("clients.id"), unique=True)
    balance_inr = Column(Float, default=0.0)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class BillingSettings(Base):
    __tablename__ = "billing_settings"
    id              = Column(Integer, primary_key=True, index=True)
    client_id       = Column(Integer, ForeignKey("clients.id"), unique=True)
    daily_cap       = Column(Float, default=0)
    monthly_cap     = Column(Float, default=0)
    auto_recharge   = Column(Boolean, default=False)
    recharge_below  = Column(Float, default=200)
    recharge_amount = Column(Float, default=1000)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Invoice(Base):
    __tablename__ = "invoices"
    id          = Column(Integer, primary_key=True, index=True)
    client_id   = Column(Integer, ForeignKey("clients.id"))
    invoice_no  = Column(String(30), unique=True)   # INV-TZMICHA-0001
    period      = Column(String(20))                # 2026-08
    plan        = Column(String(50))
    amount_inr  = Column(Float)
    status      = Column(String(20), default="paid") # paid | pending
    issued_at   = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
