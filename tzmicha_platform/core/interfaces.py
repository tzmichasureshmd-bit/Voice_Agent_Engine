"""
TZMICHA AI OS - Provider Interfaces (Adapters)
All providers must implement these interfaces.
This allows swapping any provider without touching business logic.
"""

from abc import ABC, abstractmethod
from typing import AsyncGenerator, Optional
from .models import ConversationMessage


class STTProvider(ABC):
    """Speech-to-Text Provider Interface"""

    @abstractmethod
    async def transcribe_stream(self, audio_stream: AsyncGenerator[bytes, None]) -> AsyncGenerator[str, None]:
        """
        Streaming speech-to-text.
        Receives audio chunks, yields transcript segments in real-time.
        Must support interruption detection.
        """
        ...

    @abstractmethod
    async def transcribe_buffer(self, audio_bytes: bytes, language: Optional[str] = None) -> str:
        """
        Transcribe a complete audio buffer.
        Used for shorter audio segments.
        """
        ...

    @abstractmethod
    async def detect_language(self, audio_bytes: bytes) -> str:
        """Detect language from audio sample"""
        ...


class TTSProvider(ABC):
    """Text-to-Speech Provider Interface"""

    @abstractmethod
    async def synthesize_stream(self, text: str, language: str = "en", voice_id: Optional[str] = None) -> AsyncGenerator[bytes, None]:
        """
        Streaming text-to-speech.
        Yields audio chunks as they're generated.
        Must support natural pauses and emotion.
        """
        ...

    @abstractmethod
    async def synthesize(self, text: str, language: str = "en", voice_id: Optional[str] = None) -> bytes:
        """
        Complete TTS - returns full audio buffer.
        Used for short phrases.
        """
        ...

    @abstractmethod
    def get_supported_voices(self) -> list[dict]:
        """List available voices with metadata"""
        ...


class LLMProvider(ABC):
    """Large Language Model Provider Interface"""

    @abstractmethod
    async def generate_stream(
        self,
        messages: list[dict],
        system_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 150,
    ) -> AsyncGenerator[str, None]:
        """
        Streaming LLM response.
        Yields text chunks as they're generated.
        Critical for fast response time in voice calls.
        """
        ...

    @abstractmethod
    async def generate(
        self,
        messages: list[dict],
        system_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 150,
    ) -> str:
        """
        Complete LLM response.
        Used when full response is needed before processing.
        """
        ...


class LanguageDetector(ABC):
    """Language Detection Interface"""

    @abstractmethod
    async def detect(self, text: str) -> str:
        """Detect language from text. Returns ISO code (en, hi, te)"""
        ...

    @abstractmethod
    async def detect_from_audio(self, audio_bytes: bytes) -> str:
        """Detect language from audio sample"""
        ...
