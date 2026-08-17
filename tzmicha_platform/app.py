"""
TZMICHA AI OS - Main Application (Full Version)
Entry point. Wires together all services using dependency injection.
"""

import sys
sys.stdout.reconfigure(encoding='utf-8')

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config.settings import get_settings
from .providers.factory import ProviderFactory
from .services.memory_service import MemoryService
from .services.language_service import LanguageService
from .services.conversation_service import ConversationService
from .services.voice_call_service import VoiceCallService
from .services.knowledge_service import KnowledgeService
from .services.workflow_service import WorkflowService
from .services.voice_enhancer import VoiceEnhancer
from .api.routes import router, set_services


@asynccontextmanager
async def lifespan(app):
    """Application startup/shutdown"""
    settings = get_settings()
    print(f"""
    ╔══════════════════════════════════════════════════════╗
    ║            TZMICHA AI OS v{settings.app_version}                  ║
    ║       Enterprise AI Voice Platform                   ║
    ╠══════════════════════════════════════════════════════╣
    ║  Server:     http://localhost:{settings.port}                   ║
    ║  Docs:       http://localhost:{settings.port}/docs               ║
    ║  LLM:        {settings.llm_provider:<20}                ║
    ║  STT:        {settings.stt_provider:<20}                ║
    ║  TTS:        {settings.tts_provider:<20}                ║
    ║  Languages:  {settings.supported_languages:<20}                ║
    ║  Database:   PostgreSQL                               ║
    ║  Vector DB:  Qdrant                                   ║
    ║  Cache:      Redis                                    ║
    ╚══════════════════════════════════════════════════════╝
    """)

    # Initialize database
    try:
        from .database.session import init_db
        await init_db()
        print("  ✓ Database initialized")
    except Exception as e:
        print(f"  ⚠ Database init skipped: {e}")

    yield
    print("  TZMICHA AI OS - Shutting down...")


def create_app() -> FastAPI:
    """
    Application Factory.
    Creates FastAPI app with all services wired via dependency injection.
    """
    settings = get_settings()

    app = FastAPI(
        title="TZMICHA AI OS - Voice AI Engine",
        version=settings.app_version,
        description=(
            "Enterprise AI Voice Platform. "
            "Create AI Employees that make and receive calls like real humans. "
            "Supports multiple industries, languages, and configurable workflows."
        ),
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ===== Create Providers (config-driven) =====
    llm = ProviderFactory.create_llm()
    stt = ProviderFactory.create_stt()
    tts = ProviderFactory.create_tts()

    # ===== Create Services =====
    memory = MemoryService(memory_window_size=settings.memory_window_size)
    language = LanguageService()
    knowledge = KnowledgeService()
    workflow = WorkflowService()
    voice_enhancer = VoiceEnhancer()

    conversation = ConversationService(
        llm=llm,
        memory=memory,
        language=language,
        knowledge=knowledge,
        workflow=workflow,
        voice_enhancer=voice_enhancer,
        ai_name="Alex",
        role="AI Assistant",
        company="TZMICHA AI",
        personality="friendly, professional, helpful, concise",
    )

    voice = VoiceCallService(
        stt=stt,
        tts=tts,
        conversation=conversation,
        memory=memory,
    )

    # ===== Inject into Routes =====
    set_services(voice=voice, conv=conversation, mem=memory)

    # ===== Register Routes =====
    app.include_router(router, prefix="/api/v1")

    # Root endpoint
    @app.get("/")
    def root():
        return {
            "platform": "TZMICHA AI OS",
            "version": settings.app_version,
            "product": "Enterprise AI Voice Platform",
            "tagline": "AI Employees that sound human",
            "status": "running",
            "docs": "/docs",
            "api": "/api/v1",
            "providers": {
                "llm": settings.llm_provider,
                "stt": settings.stt_provider,
                "tts": settings.tts_provider,
            },
            "features": [
                "Multi-language (EN, HI, TE)",
                "Topic switching & memory",
                "Interruption handling",
                "RAG knowledge base",
                "Configurable workflows",
                "Natural voice enhancement",
                "Provider-independent architecture",
            ],
        }

    return app


# Create app instance
app = create_app()
