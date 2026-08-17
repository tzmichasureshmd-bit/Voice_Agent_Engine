"""
TZMICHA AI OS - Provider Factory
Instantiates the correct provider based on configuration.
Switch providers by changing settings only - zero code changes.
"""

from ..core.interfaces import STTProvider, TTSProvider, LLMProvider
from ..config.settings import get_settings


class ProviderFactory:
    """
    Factory that creates provider instances based on config.
    Dependency Injection pattern - decouples business logic from providers.
    """

    @staticmethod
    def create_stt() -> STTProvider:
        """Create Speech-to-Text provider based on config"""
        settings = get_settings()
        provider = settings.stt_provider.lower()

        if provider == "deepgram":
            from .stt.deepgram_stt import DeepgramSTT
            return DeepgramSTT()
        elif provider == "whisper":
            from .stt.whisper_stt import WhisperSTT
            return WhisperSTT()
        elif provider == "openai":
            from .stt.openai_stt import OpenAISTT
            return OpenAISTT()
        else:
            raise ValueError(f"Unknown STT provider: {provider}. Use: deepgram, whisper, openai")

    @staticmethod
    def create_tts() -> TTSProvider:
        """Create Text-to-Speech provider based on config"""
        settings = get_settings()
        provider = settings.tts_provider.lower()

        if provider == "elevenlabs":
            from .tts.elevenlabs_tts import ElevenLabsTTS
            return ElevenLabsTTS()
        elif provider == "deepgram":
            from .tts.deepgram_tts import DeepgramTTS
            return DeepgramTTS()
        elif provider == "piper":
            from .tts.piper_tts import PiperTTS
            return PiperTTS()
        else:
            raise ValueError(f"Unknown TTS provider: {provider}. Use: elevenlabs, deepgram, piper")

    @staticmethod
    def create_llm() -> LLMProvider:
        """Create LLM provider based on config"""
        settings = get_settings()
        provider = settings.llm_provider.lower()

        if provider == "groq":
            from .llm.groq_llm import GroqLLM
            return GroqLLM()
        elif provider == "ollama":
            from .llm.ollama_llm import OllamaLLM
            return OllamaLLM()
        elif provider == "openai":
            from .llm.openai_llm import OpenAILLM
            return OpenAILLM()
        elif provider == "anthropic":
            from .llm.anthropic_llm import AnthropicLLM
            return AnthropicLLM()
        else:
            raise ValueError(f"Unknown LLM provider: {provider}. Use: groq, ollama, openai, anthropic")
