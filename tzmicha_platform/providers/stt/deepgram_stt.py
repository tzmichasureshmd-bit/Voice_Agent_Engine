"""
TZMICHA AI OS - Deepgram Speech-to-Text Provider
Real-time streaming STT with ~300ms latency.
Best for production voice calls.
"""

import httpx
import json
import asyncio
import websockets
from typing import AsyncGenerator, Optional

from ...core.interfaces import STTProvider
from ...config.settings import get_settings


class DeepgramSTT(STTProvider):
    """Deepgram Nova-2 STT - fast, accurate, streaming"""

    def __init__(self):
        settings = get_settings()
        self.api_key = settings.deepgram_api_key
        self.model = settings.deepgram_stt_model
        self.base_url = "https://api.deepgram.com/v1"
        self.ws_url = "wss://api.deepgram.com/v1/listen"

    async def transcribe_stream(self, audio_stream: AsyncGenerator[bytes, None]) -> AsyncGenerator[str, None]:
        """
        Real-time streaming transcription via WebSocket.
        Sends audio chunks, yields transcript segments as they arrive.
        Supports interruption detection through interim results.
        """
        params = (
            f"?model={self.model}"
            f"&smart_format=true"
            f"&interim_results=true"
            f"&endpointing=300"
            f"&vad_events=true"
            f"&utterance_end_ms=1000"
        )

        headers = {"Authorization": f"Token {self.api_key}"}

        try:
            async with websockets.connect(
                f"{self.ws_url}{params}",
                extra_headers=headers,
            ) as ws:
                # Send audio in background
                async def send_audio():
                    async for chunk in audio_stream:
                        if chunk:
                            await ws.send(chunk)
                    # Signal end of audio
                    await ws.send(json.dumps({"type": "CloseStream"}))

                send_task = asyncio.create_task(send_audio())

                # Receive transcripts
                try:
                    async for message in ws:
                        data = json.loads(message)
                        msg_type = data.get("type", "")

                        if msg_type == "Results":
                            channel = data.get("channel", {})
                            alternatives = channel.get("alternatives", [])
                            if alternatives:
                                transcript = alternatives[0].get("transcript", "").strip()
                                is_final = data.get("is_final", False)

                                if transcript and is_final:
                                    yield transcript

                        elif msg_type == "UtteranceEnd":
                            # Speaker stopped talking
                            yield "[END_OF_UTTERANCE]"

                except websockets.exceptions.ConnectionClosed:
                    pass
                finally:
                    send_task.cancel()

        except Exception as e:
            yield f"[STT_ERROR: {str(e)}]"

    async def transcribe_buffer(self, audio_bytes: bytes, language: Optional[str] = None) -> str:
        """Transcribe complete audio buffer"""
        params = {
            "model": self.model,
            "smart_format": "true",
        }
        if language:
            params["language"] = language

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/listen",
                headers={
                    "Authorization": f"Token {self.api_key}",
                    "Content-Type": "audio/wav",
                },
                params=params,
                content=audio_bytes,
                timeout=15.0,
            )

            if response.status_code == 200:
                data = response.json()
                channels = data.get("results", {}).get("channels", [])
                if channels:
                    alternatives = channels[0].get("alternatives", [])
                    if alternatives:
                        return alternatives[0].get("transcript", "")
            return ""

    async def detect_language(self, audio_bytes: bytes) -> str:
        """Detect language from audio using Deepgram"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/listen",
                headers={
                    "Authorization": f"Token {self.api_key}",
                    "Content-Type": "audio/wav",
                },
                params={
                    "model": self.model,
                    "detect_language": "true",
                },
                content=audio_bytes,
                timeout=10.0,
            )

            if response.status_code == 200:
                data = response.json()
                channels = data.get("results", {}).get("channels", [])
                if channels:
                    detected = channels[0].get("detected_language", "en")
                    return detected
            return "en"
