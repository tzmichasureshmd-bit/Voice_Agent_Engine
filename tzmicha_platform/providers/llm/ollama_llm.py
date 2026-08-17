"""
TZMICHA AI OS - Ollama LLM Provider
Local, free, no API key. Runs on your machine.
Good for development and privacy-sensitive deployments.
"""

import httpx
import json
from typing import AsyncGenerator

from ...core.interfaces import LLMProvider
from ...config.settings import get_settings


class OllamaLLM(LLMProvider):
    """Ollama - local LLM, free, no internet needed"""

    def __init__(self):
        settings = get_settings()
        self.base_url = settings.ollama_base_url
        self.model = settings.ollama_model

    async def generate_stream(
        self,
        messages: list[dict],
        system_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 150,
    ) -> AsyncGenerator[str, None]:
        """Streaming from local Ollama"""
        all_messages = [{"role": "system", "content": system_prompt}] + messages

        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": all_messages,
                    "stream": True,
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens,
                    },
                },
                timeout=60.0,
            ) as response:
                if response.status_code == 200:
                    async for line in response.aiter_lines():
                        if line:
                            try:
                                chunk = json.loads(line)
                                content = chunk.get("message", {}).get("content", "")
                                if content:
                                    yield content
                                if chunk.get("done", False):
                                    break
                            except json.JSONDecodeError:
                                continue

    async def generate(
        self,
        messages: list[dict],
        system_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 150,
    ) -> str:
        """Complete response from Ollama"""
        all_messages = [{"role": "system", "content": system_prompt}] + messages

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": all_messages,
                    "stream": False,
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens,
                    },
                },
                timeout=60.0,
            )

            if response.status_code == 200:
                data = response.json()
                return data.get("message", {}).get("content", "")
            return f"[Ollama Error: {response.status_code} - Is Ollama running?]"
