"""
TZMICHA AI OS - OpenAI Speech-to-Text Provider
Uses OpenAI Whisper API (cloud). High accuracy, paid.
"""

import httpx
import asyncio
from typing import AsyncGenerator, Optional

from ...core.interfaces import STTProvider
from ...config.settings import get_settings


class OpenAISTT(STTProvider):
    """OpenAI Whisper API - cloud-based, high accuracy"""

    def __init__(self):
        settings = get_settings()
        self.api_key = settings.openai_api_key
        self.base_url = "https://api.openai.com/v1"

    async def transcribe_stream(self, audio_stream: AsyncGenerator[bytes, None]) -> AsyncGenerator[str, None]:
        """
        OpenAI Whisper API doesn't support true streaming.
        Buffer chunks and transcribe in segments.
        """
        buffer = b""
        chunk_size = 48000  # ~3 seconds at 16kHz

        async for chunk in audio_stream:
            buffer += chunk

            if len(buffer) >= chunk_size:
                transcript = await self.transcribe_buffer(buffer)
                buffer = b""
                if transcript.strip():
                    yield transcript

        if buffer:
            transcript = await self.transcribe_buffer(buffer)
            if transcript.strip():
                yield transcript

    async def transcribe_buffer(self, audio_bytes: bytes, language: Optional[str] = None) -> str:
        """Transcribe using OpenAI Whisper API"""
        async with httpx.AsyncClient() as client:
            files = {"file": ("audio.wav", audio_bytes, "audio/wav")}
            data = {"model": "whisper-1"}
            if language:
                data["language"] = language

            response = await client.post(
                f"{self.base_url}/audio/transcriptions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                files=files,
                data=data,
                timeout=30.0,
            )

            if response.status_code == 200:
                return response.json().get("text", "")
            return ""

    async def detect_language(self, audio_bytes: bytes) -> str:
        """Detect language via OpenAI - transcribe and check detected language"""
        async with httpx.AsyncClient() as client:
            files = {"file": ("audio.wav", audio_bytes, "audio/wav")}
            data = {"model": "whisper-1", "response_format": "verbose_json"}

            response = await client.post(
                f"{self.base_url}/audio/transcriptions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                files=files,
                data=data,
                timeout=30.0,
            )

            if response.status_code == 200:
                return response.json().get("language", "en")
            return "en"
