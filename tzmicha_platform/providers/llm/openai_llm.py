"""
TZMICHA AI OS - OpenAI LLM Provider
GPT-4o, GPT-4o-mini. High quality, paid.
"""

import httpx
import json
from typing import AsyncGenerator

from ...core.interfaces import LLMProvider
from ...config.settings import get_settings


class OpenAILLM(LLMProvider):
    """OpenAI GPT - high quality, reliable"""

    def __init__(self):
        settings = get_settings()
        self.api_key = settings.openai_api_key
        self.model = settings.openai_model
        self.base_url = "https://api.openai.com/v1"

    async def generate_stream(
        self,
        messages: list[dict],
        system_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 150,
    ) -> AsyncGenerator[str, None]:
        """Streaming from OpenAI"""
        all_messages = [{"role": "system", "content": system_prompt}] + messages

        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": all_messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "stream": True,
                },
                timeout=30.0,
            ) as response:
                if response.status_code == 200:
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data = line[6:]
                            if data == "[DONE]":
                                break
                            try:
                                chunk = json.loads(data)
                                delta = chunk["choices"][0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    yield content
                            except (json.JSONDecodeError, KeyError, IndexError):
                                continue

    async def generate(
        self,
        messages: list[dict],
        system_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 150,
    ) -> str:
        """Complete response from OpenAI"""
        all_messages = [{"role": "system", "content": system_prompt}] + messages

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": all_messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                },
                timeout=30.0,
            )

            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"]
            return f"[OpenAI Error: {response.status_code}]"
