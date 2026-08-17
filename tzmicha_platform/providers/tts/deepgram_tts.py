"""
TZMICHA AI OS - Deepgram Text-to-Speech Provider
Fast, affordable, streaming TTS via Deepgram Aura.
"""

import httpx
from typing import AsyncGenerator, Optional

from ...core.interfaces import TTSProvider
from ...config.settings import get_settings


class DeepgramTTS(TTSProvider):
    """Deepgram Aura TTS - fast streaming synthesis"""

    def __init__(self):
        settings = get_settings()
        self.api_key = settings.deepgram_api_key
        self.model = settings.deepgram_tts_model
        self.base_url = "https://api.deepgram.com/v1"

    async def synthesize_stream(self, text: str, language: str = "en", voice_id: Optional[str] = None) -> AsyncGenerator[bytes, None]:
        """Streaming TTS via Deepgram"""
        model = voice_id or self.model

        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/speak",
                headers={
                    "Authorization": f"Token {self.api_key}",
                    "Content-Type": "application/json",
                },
                params={"model": model},
                json={"text": text},
                timeout=15.0,
            ) as response:
                if response.status_code == 200:
                    async for chunk in response.aiter_bytes(chunk_size=1024):
                        if chunk:
                            yield chunk

    async def synthesize(self, text: str, language: str = "en", voice_id: Optional[str] = None) -> bytes:
        """Complete TTS"""
        model = voice_id or self.model

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/speak",
                headers={
                    "Authorization": f"Token {self.api_key}",
                    "Content-Type": "application/json",
                },
                params={"model": model},
                json={"text": text},
                timeout=15.0,
            )

            if response.status_code == 200:
                return response.content
            return b""

    def get_supported_voices(self) -> list[dict]:
        """Deepgram Aura voices"""
        return [
            {"id": "aura-asteria-en", "name": "Asteria", "language": "en", "gender": "female"},
            {"id": "aura-luna-en", "name": "Luna", "language": "en", "gender": "female"},
            {"id": "aura-stella-en", "name": "Stella", "language": "en", "gender": "female"},
            {"id": "aura-orion-en", "name": "Orion", "language": "en", "gender": "male"},
            {"id": "aura-arcas-en", "name": "Arcas", "language": "en", "gender": "male"},
        ]
