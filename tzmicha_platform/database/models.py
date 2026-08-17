"""
TZMICHA AI OS - Database Models
Enterprise-grade data models for the AI Voice Platform.

Core entities:
- Client: Company/organization using the platform
- AIEmployee: The AI workers (receptionist, sales exec, etc.)
- KnowledgeBase: Company knowledge for RAG
- Workflow: Configurable conversation flows
- CallLog: Every call with transcript & analysis
- Lead: Leads generated/qualified by AI
- Conversation: Full conversation history
"""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime,
    ForeignKey, JSON, Enum as SQLEnum, Index
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY

from .session import Base


# ===== CLIENT (Company/Organization) =====

class Client(Base):
    """
    A company/organization using TZMICHA AI OS.
    Multi-tenant: all data isolated per client.
    """
    __tablename__ = "clients"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Company Info
    company_name: Mapped[str] = mapped_column(String(200), nullable=False)
    industry: Mapped[str] = mapped_column(String(100), nullable=False)
    contact_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    website: Mapped[Optional[str]] = mapped_column(String(300))
    
    # Authentication
    password_hash: Mapped[str] = mapped_column(String(300), nullable=False)
    api_key: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True)
    
    # Subscription
    plan: Mapped[str] = mapped_column(String(20), default="free")  # free, starter, pro, enterprise
    max_ai_employees: Mapped[int] = mapped_column(Integer, default=1)
    max_calls_per_month: Mapped[int] = mapped_column(Integer, default=50)
    calls_this_month: Mapped[int] = mapped_column(Integer, default=0)
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    ai_employees = relationship("AIEmployee", back_populates="client", cascade="all, delete-orphan")
    knowledge_bases = relationship("KnowledgeBase", back_populates="client", cascade="all, delete-orphan")
    calls = relationship("CallLog", back_populates="client", cascade="all, delete-orphan")
    leads = relationship("Lead", back_populates="client", cascade="all, delete-orphan")


# ===== AI EMPLOYEE =====

class AIEmployee(Base):
    """
    An AI Employee - the core entity of TZMICHA AI OS.
    
    Each AI Employee has:
    - Identity (name, voice, personality)
    - Knowledge (connected to knowledge base)
    - Workflow (conversation flow to follow)
    - Configuration (languages, hours, escalation)
    """
    __tablename__ = "ai_employees"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("clients.id"), nullable=False)
    
    # Identity
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # "Priya", "Alex"
    role: Mapped[str] = mapped_column(String(100), nullable=False)  # "AI Receptionist", "AI Sales Executive"
    
    # Voice Configuration
    voice_provider: Mapped[str] = mapped_column(String(50), default="elevenlabs")  # elevenlabs, deepgram, piper
    voice_id: Mapped[str] = mapped_column(String(100), default="21m00Tcm4TlvDq8ikWAM")  # Provider-specific voice ID
    voice_speed: Mapped[float] = mapped_column(Float, default=1.0)  # 0.5 to 2.0
    voice_pitch: Mapped[float] = mapped_column(Float, default=1.0)
    
    # Personality & Behavior
    personality: Mapped[str] = mapped_column(Text, default="friendly, professional, helpful")
    greeting_style: Mapped[str] = mapped_column(String(50), default="warm")  # warm, formal, casual
    tone: Mapped[str] = mapped_column(String(50), default="friendly")  # friendly, professional, casual, authoritative
    custom_instructions: Mapped[Optional[str]] = mapped_column(Text)  # Additional system prompt
    
    # Language
    primary_language: Mapped[str] = mapped_column(String(10), default="en")
    supported_languages: Mapped[str] = mapped_column(String(100), default="en,hi,te")  # Comma-separated
    language_switching: Mapped[bool] = mapped_column(Boolean, default=True)  # Auto-switch if customer changes
    
    # Knowledge
    knowledge_base_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("knowledge_bases.id"))
    
    # Workflow
    workflow_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("workflows.id"))
    
    # Goals (what this AI Employee should achieve)
    goals: Mapped[Optional[str]] = mapped_column(JSONB, default=list)
    # Example: ["qualify_lead", "book_appointment", "collect_info", "answer_faq"]
    
    # Working Hours
    working_hours_start: Mapped[Optional[str]] = mapped_column(String(10), default="09:00")  # HH:MM
    working_hours_end: Mapped[Optional[str]] = mapped_column(String(10), default="18:00")
    working_days: Mapped[str] = mapped_column(String(50), default="mon,tue,wed,thu,fri")
    timezone: Mapped[str] = mapped_column(String(50), default="Asia/Kolkata")
    after_hours_message: Mapped[Optional[str]] = mapped_column(Text)
    
    # Escalation Rules
    escalation_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    escalation_triggers: Mapped[Optional[str]] = mapped_column(JSONB, default=list)
    # Example: ["angry_customer", "legal_question", "pricing_negotiation", "human_requested"]
    escalation_phone: Mapped[Optional[str]] = mapped_column(String(20))
    escalation_email: Mapped[Optional[str]] = mapped_column(String(200))
    
    # Call Settings
    max_call_duration_seconds: Mapped[int] = mapped_column(Integer, default=300)
    max_turns: Mapped[int] = mapped_column(Integer, default=30)
    silence_timeout_ms: Mapped[int] = mapped_column(Integer, default=5000)
    
    # LLM Configuration
    llm_provider: Mapped[str] = mapped_column(String(50), default="groq")
    llm_model: Mapped[Optional[str]] = mapped_column(String(100))
    llm_temperature: Mapped[float] = mapped_column(Float, default=0.7)
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    total_calls: Mapped[int] = mapped_column(Integer, default=0)
    total_leads_qualified: Mapped[int] = mapped_column(Integer, default=0)
    total_appointments_booked: Mapped[int] = mapped_column(Integer, default=0)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    client = relationship("Client", back_populates="ai_employees")
    knowledge_base = relationship("KnowledgeBase", backref="ai_employees")
    workflow = relationship("Workflow", backref="ai_employees")
    calls = relationship("CallLog", back_populates="ai_employee", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_ai_employee_client", "client_id"),
        Index("idx_ai_employee_active", "is_active"),
    )


# ===== KNOWLEDGE BASE =====

class KnowledgeBase(Base):
    """
    Company knowledge store for RAG.
    Each client can have multiple knowledge bases.
    AI Employees connect to a knowledge base to answer questions.
    """
    __tablename__ = "knowledge_bases"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("clients.id"), nullable=False)
    
    name: Mapped[str] = mapped_column(String(200), nullable=False)  # "Company FAQ", "Product Info"
    description: Mapped[Optional[str]] = mapped_column(Text)
    
    # Qdrant collection name (unique per knowledge base)
    vector_collection: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    
    # Stats
    total_documents: Mapped[int] = mapped_column(Integer, default=0)
    total_chunks: Mapped[int] = mapped_column(Integer, default=0)
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_updated: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    client = relationship("Client", back_populates="knowledge_bases")
    documents = relationship("KnowledgeDocument", back_populates="knowledge_base", cascade="all, delete-orphan")


class KnowledgeDocument(Base):
    """Individual documents uploaded to a knowledge base"""
    __tablename__ = "knowledge_documents"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    knowledge_base_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("knowledge_bases.id"), nullable=False)
    
    filename: Mapped[str] = mapped_column(String(300), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)  # pdf, txt, csv, url
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    
    # Processing
    chunks_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, processing, completed, failed
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    
    # Timestamps
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    # Relationships
    knowledge_base = relationship("KnowledgeBase", back_populates="documents")


# ===== WORKFLOW =====

class Workflow(Base):
    """
    Configurable conversation flow.
    Defines the steps an AI Employee follows during a call.
    
    Graph structure stored as JSON:
    {
        "nodes": [
            {"id": "greet", "type": "greet", "config": {...}},
            {"id": "qualify", "type": "qualify", "config": {...}},
            ...
        ],
        "edges": [
            {"from": "greet", "to": "qualify", "condition": "customer_responded"},
            ...
        ]
    }
    """
    __tablename__ = "workflows"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("clients.id"), nullable=False)
    
    name: Mapped[str] = mapped_column(String(200), nullable=False)  # "Sales Call Flow"
    description: Mapped[Optional[str]] = mapped_column(Text)
    industry: Mapped[Optional[str]] = mapped_column(String(100))  # Template for industry
    
    # Graph definition
    graph: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    
    # Workflow steps (ordered)
    # Each step: {"id", "type", "prompt", "next_on_success", "next_on_failure", "config"}
    # Types: greet, qualify, pitch, faq, objection_handle, book_appointment, collect_info, escalate, end
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_template: Mapped[bool] = mapped_column(Boolean, default=False)  # Pre-built templates
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ===== CALL LOG =====

class CallLog(Base):
    """
    Every call made by an AI Employee.
    Full audit trail with transcript, analysis, and outcome.
    """
    __tablename__ = "call_logs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("clients.id"), nullable=False)
    ai_employee_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("ai_employees.id"), nullable=False)
    
    # Call Details
    phone_number: Mapped[Optional[str]] = mapped_column(String(20))
    direction: Mapped[str] = mapped_column(String(10), default="outbound")  # inbound, outbound
    call_type: Mapped[str] = mapped_column(String(20), default="voice")  # voice, simulator
    
    # Twilio / Provider reference
    provider_call_id: Mapped[Optional[str]] = mapped_column(String(100))
    
    # Timing
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    
    # Conversation
    transcript: Mapped[Optional[str]] = mapped_column(JSONB)  # Full conversation as JSON array
    total_turns: Mapped[int] = mapped_column(Integer, default=0)
    languages_used: Mapped[Optional[str]] = mapped_column(String(100))  # "en,te"
    
    # Analysis
    sentiment: Mapped[Optional[str]] = mapped_column(String(20))  # positive, neutral, negative
    lead_score: Mapped[int] = mapped_column(Integer, default=0)  # 1-10
    category: Mapped[Optional[str]] = mapped_column(String(20))  # hot, warm, cold
    summary: Mapped[Optional[str]] = mapped_column(Text)
    topics_discussed: Mapped[Optional[str]] = mapped_column(JSONB)  # List of topics
    
    # Outcome
    outcome: Mapped[Optional[str]] = mapped_column(String(50))
    # appointment_booked, lead_qualified, info_collected, not_interested, escalated, no_answer
    appointment_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    # Status
    status: Mapped[str] = mapped_column(String(20), default="completed")
    # initiating, ringing, connected, completed, failed, no_answer
    
    # Lead reference
    lead_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("leads.id"))
    
    # Relationships
    client = relationship("Client", back_populates="calls")
    ai_employee = relationship("AIEmployee", back_populates="calls")
    lead = relationship("Lead", backref="calls")

    __table_args__ = (
        Index("idx_call_client_date", "client_id", "started_at"),
        Index("idx_call_employee", "ai_employee_id"),
    )


# ===== LEAD =====

class Lead(Base):
    """Leads generated/qualified by AI Employees"""
    __tablename__ = "leads"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("clients.id"), nullable=False)
    
    # Contact Info
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    email: Mapped[Optional[str]] = mapped_column(String(200))
    company: Mapped[Optional[str]] = mapped_column(String(200))
    
    # Qualification
    score: Mapped[int] = mapped_column(Integer, default=0)  # 1-10
    category: Mapped[str] = mapped_column(String(20), default="new")  # new, hot, warm, cold
    status: Mapped[str] = mapped_column(String(30), default="new")
    # new, contacted, qualified, appointment_set, converted, not_interested
    
    # AI gathered info
    interests: Mapped[Optional[str]] = mapped_column(JSONB)  # What they're interested in
    objections: Mapped[Optional[str]] = mapped_column(JSONB)  # Their concerns
    notes: Mapped[Optional[str]] = mapped_column(Text)
    preferred_language: Mapped[str] = mapped_column(String(10), default="en")
    
    # Memory (AI remembers this person across calls)
    previous_interactions: Mapped[int] = mapped_column(Integer, default=0)
    last_call_summary: Mapped[Optional[str]] = mapped_column(Text)
    customer_preferences: Mapped[Optional[str]] = mapped_column(JSONB)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_contacted_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    # Relationships
    client = relationship("Client", back_populates="leads")

    __table_args__ = (
        Index("idx_lead_client_category", "client_id", "category"),
        Index("idx_lead_phone", "phone"),
    )


# ===== CONVERSATION (for persistent memory) =====

class Conversation(Base):
    """
    Persistent conversation record.
    Used to maintain memory across multiple calls with same customer.
    """
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("clients.id"), nullable=False)
    lead_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("leads.id"))
    ai_employee_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("ai_employees.id"))
    
    # Conversation state
    messages: Mapped[Optional[str]] = mapped_column(JSONB, default=list)
    context_summary: Mapped[Optional[str]] = mapped_column(Text)
    topics_discussed: Mapped[Optional[str]] = mapped_column(JSONB, default=list)
    
    # Status
    status: Mapped[str] = mapped_column(String(20), default="active")  # active, completed, paused
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_conversation_lead", "lead_id"),
    )
