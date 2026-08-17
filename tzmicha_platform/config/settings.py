"""
TZMICHA AI OS - Configuration System
Provider-independent, config-driven architecture.
Switch STT/TTS/LLM providers by changing config only.
"""

import os
from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    """Central configuration for TZMICHA AI OS"""

    # ===== Platform =====
    app_name: str = "TZMICHA AI OS"
    app_version: str = "1.0.0"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000

    # ===== Provider Selection (switch providers here) =====
    stt_provider: str = Field(default="deepgram", description="deepgram | whisper | openai")
    tts_provider: str = Field(default="elevenlabs", description="elevenlabs | deepgram | piper")
    llm_provider: str = Field(default="groq", description="groq | ollama | openai | anthropic")

    # ===== Database =====
    database_url: str = "postgresql+asyncpg://tzmicha:tzmicha_secure_2024@localhost:5432/tzmicha_db"
    redis_url: str = "redis://localhost:6379/0"
    qdrant_url: str = "http://localhost:6333"

    # ===== Groq (Free tier - default LLM) =====
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    groq_temperature: float = 0.7
    groq_max_tokens: int = 150

    # ===== Ollama (Local, free) =====
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"

    # ===== OpenAI =====
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # ===== Anthropic =====
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-3-5-sonnet-20241022"

    # ===== Gemini =====
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"

    # ===== Deepgram (STT + TTS) =====
    deepgram_api_key: str = ""
    deepgram_stt_model: str = "nova-2"
    deepgram_tts_model: str = "aura-asteria-en"

    # ===== ElevenLabs (TTS) =====
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = "21m00Tcm4TlvDq8ikWAM"
    elevenlabs_model: str = "eleven_turbo_v2"

    # ===== Piper (Local TTS - free) =====
    piper_model_path: str = "./models/piper/en_US-lessac-medium.onnx"

    # ===== Whisper (Local STT - free) =====
    whisper_model_size: str = "base"

    # ===== Twilio (Voice Calls) =====
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""
    server_public_url: str = "http://localhost:8000"

    # ===== Conversation Settings =====
    max_conversation_turns: int = 50
    memory_window_size: int = 20
    interruption_silence_ms: int = 500
    response_timeout_ms: int = 3000

    # ===== Language Settings =====
    default_language: str = "en"
    supported_languages: str = "en,hi,te"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Singleton settings instance"""
    return Settings()
