"""
TZMICHA AI OS - ElevenLabs Text-to-Speech Provider
Most natural human-like voice. Streaming support.
Best for production voice calls.
"""

import httpx
from typing import AsyncGenerator, Optional

from ...core.interfaces import TTSProvider
from ...config.settings import get_settings


class ElevenLabsTTS(TTSProvider):
    """ElevenLabs TTS - human-like voice with emotion"""

    def __init__(self):
        settings = get_settings()
        self.api_key = settings.elevenlabs_api_key
        self.voice_id = settings.elevenlabs_voice_id
        self.model = settings.elevenlabs_model
        self.base_url = "https://api.elevenlabs.io/v1"

    async def synthesize_stream(self, text: str, language: str = "en", voice_id: Optional[str] = None) -> AsyncGenerator[bytes, None]:
        """
        Streaming TTS - yields audio chunks as generated.
        Uses ElevenLabs streaming endpoint for low latency.
        """
        voice = voice_id or self.voice_id

        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/text-to-speech/{voice}/stream",
                headers={
                    "xi-api-key": self.api_key,
                    "Content-Type": "application/json",
                },
                json={
                    "text": text,
                    "model_id": self.model,
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75,
                        "style": 0.3,
                        "use_speaker_boost": True,
                    },
                },
                timeout=15.0,
            ) as response:
                if response.status_code == 200:
                    async for chunk in response.aiter_bytes(chunk_size=1024):
                        if chunk:
                            yield chunk

    async def synthesize(self, text: str, language: str = "en", voice_id: Optional[str] = None) -> bytes:
        """Complete TTS - returns full audio"""
        voice = voice_id or self.voice_id

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/text-to-speech/{voice}",
                headers={
                    "xi-api-key": self.api_key,
                    "Content-Type": "application/json",
                },
                json={
                    "text": text,
                    "model_id": self.model,
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75,
                        "style": 0.3,
                        "use_speaker_boost": True,
                    },
                },
                timeout=15.0,
            )

            if response.status_code == 200:
                return response.content
            return b""

    def get_supported_voices(self) -> list[dict]:
        """List ElevenLabs voices"""
        return [
            {"id": "21m00Tcm4TlvDq8ikWAM", "name": "Rachel", "language": "en", "gender": "female"},
            {"id": "29vD33N1CtxCmqQRPOHJ", "name": "Drew", "language": "en", "gender": "male"},
            {"id": "EXAVITQu4vr4xnSDxMaL", "name": "Bella", "language": "en", "gender": "female"},
            {"id": "ErXwobaYiN019PkySvjV", "name": "Antoni", "language": "en", "gender": "male"},
            {"id": "MF3mGyEYCl7XYWbV9V6O", "name": "Elli", "language": "en", "gender": "female"},
        ]
