"""
TZMICHA AI OS - Piper Text-to-Speech Provider
Local, free, open-source TTS.
Good quality, no API key needed, runs on CPU.
"""

import asyncio
import subprocess
import os
from typing import AsyncGenerator, Optional

from ...core.interfaces import TTSProvider
from ...config.settings import get_settings


class PiperTTS(TTSProvider):
    """Piper TTS - local, free, open-source"""

    def __init__(self):
        settings = get_settings()
        self.model_path = settings.piper_model_path

    async def synthesize_stream(self, text: str, language: str = "en", voice_id: Optional[str] = None) -> AsyncGenerator[bytes, None]:
        """
        Piper generates full audio then streams chunks.
        Not true streaming, but fast enough for short sentences.
        """
        audio = await self.synthesize(text, language, voice_id)
        if audio:
            # Stream in 1KB chunks
            chunk_size = 1024
            for i in range(0, len(audio), chunk_size):
                yield audio[i:i + chunk_size]

    async def synthesize(self, text: str, language: str = "en", voice_id: Optional[str] = None) -> bytes:
        """Generate speech using Piper CLI"""
        model = voice_id or self.model_path

        try:
            loop = asyncio.get_event_loop()
            audio = await loop.run_in_executor(None, self._run_piper, text, model)
            return audio
        except Exception:
            return b""

    def _run_piper(self, text: str, model_path: str) -> bytes:
        """Run Piper in subprocess"""
        try:
            process = subprocess.run(
                ["piper", "--model", model_path, "--output-raw"],
                input=text.encode("utf-8"),
                capture_output=True,
                timeout=10,
            )
            return process.stdout
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return b""

    def get_supported_voices(self) -> list[dict]:
        """Piper voice models (need to be downloaded)"""
        return [
            {"id": "en_US-lessac-medium", "name": "Lessac (US)", "language": "en", "gender": "male"},
            {"id": "en_US-amy-medium", "name": "Amy (US)", "language": "en", "gender": "female"},
            {"id": "en_GB-alba-medium", "name": "Alba (British)", "language": "en-gb", "gender": "female"},
            {"id": "hi_IN-swara-medium", "name": "Swara (Hindi)", "language": "hi", "gender": "female"},
        ]
