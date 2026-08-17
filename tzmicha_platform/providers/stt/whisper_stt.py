"""
TZMICHA AI OS - Whisper Speech-to-Text Provider
Local, free, no API key needed.
Good for development and cost-sensitive deployments.
"""

import asyncio
import tempfile
import os
from typing import AsyncGenerator, Optional

from ...core.interfaces import STTProvider
from ...config.settings import get_settings


class WhisperSTT(STTProvider):
    """OpenAI Whisper (local) - free, offline STT"""

    def __init__(self):
        settings = get_settings()
        self.model_size = settings.whisper_model_size
        self._model = None

    def _load_model(self):
        """Lazy load Whisper model"""
        if self._model is None:
            try:
                import whisper
                self._model = whisper.load_model(self.model_size)
            except ImportError:
                raise RuntimeError(
                    "Whisper not installed. Run: pip install openai-whisper"
                )
        return self._model

    async def transcribe_stream(self, audio_stream: AsyncGenerator[bytes, None]) -> AsyncGenerator[str, None]:
        """
        Whisper doesn't support true streaming.
        We buffer audio in chunks and transcribe each chunk.
        For real-time, prefer Deepgram. Whisper is for offline/batch.
        """
        buffer = b""
        chunk_size = 32000  # ~2 seconds at 16kHz mono

        async for chunk in audio_stream:
            buffer += chunk

            if len(buffer) >= chunk_size:
                transcript = await self.transcribe_buffer(buffer)
                buffer = b""
                if transcript.strip():
                    yield transcript

        # Transcribe remaining buffer
        if buffer:
            transcript = await self.transcribe_buffer(buffer)
            if transcript.strip():
                yield transcript

    async def transcribe_buffer(self, audio_bytes: bytes, language: Optional[str] = None) -> str:
        """Transcribe audio buffer using Whisper"""
        model = self._load_model()

        # Write to temp file (Whisper needs file path)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(audio_bytes)
            temp_path = f.name

        try:
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: model.transcribe(
                    temp_path,
                    language=language,
                    fp16=False,
                )
            )
            return result.get("text", "").strip()
        finally:
            os.unlink(temp_path)

    async def detect_language(self, audio_bytes: bytes) -> str:
        """Detect language using Whisper"""
        model = self._load_model()

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(audio_bytes)
            temp_path = f.name

        try:
            loop = asyncio.get_event_loop()
            # Whisper can detect language from first 30 seconds
            result = await loop.run_in_executor(
                None,
                lambda: model.transcribe(temp_path, fp16=False)
            )
            return result.get("language", "en")
        finally:
            os.unlink(temp_path)
