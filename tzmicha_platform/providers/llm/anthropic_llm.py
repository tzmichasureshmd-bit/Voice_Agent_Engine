"""
TZMICHA AI OS - Anthropic LLM Provider
Claude models. Excellent at following instructions.
"""

import httpx
import json
from typing import AsyncGenerator

from ...core.interfaces import LLMProvider
from ...config.settings import get_settings


class AnthropicLLM(LLMProvider):
    """Anthropic Claude - excellent instruction following"""

    def __init__(self):
        settings = get_settings()
        self.api_key = settings.anthropic_api_key
        self.model = settings.anthropic_model
        self.base_url = "https://api.anthropic.com/v1"

    async def generate_stream(
        self,
        messages: list[dict],
        system_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 150,
    ) -> AsyncGenerator[str, None]:
        """Streaming from Anthropic"""
        # Anthropic uses separate system param, not in messages
        user_messages = [m for m in messages if m["role"] != "system"]

        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/messages",
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "system": system_prompt,
                    "messages": user_messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                    "stream": True,
                },
                timeout=30.0,
            ) as response:
                if response.status_code == 200:
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data = line[6:]
                            try:
                                event = json.loads(data)
                                if event.get("type") == "content_block_delta":
                                    delta = event.get("delta", {})
                                    text = delta.get("text", "")
                                    if text:
                                        yield text
                            except json.JSONDecodeError:
                                continue

    async def generate(
        self,
        messages: list[dict],
        system_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 150,
    ) -> str:
        """Complete response from Anthropic"""
        user_messages = [m for m in messages if m["role"] != "system"]

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/messages",
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "system": system_prompt,
                    "messages": user_messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                },
                timeout=30.0,
            )

            if response.status_code == 200:
                data = response.json()
                content = data.get("content", [])
                if content:
                    return content[0].get("text", "")
            return f"[Anthropic Error: {response.status_code}]"
