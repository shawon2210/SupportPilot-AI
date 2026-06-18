"""SupportPilot AI — Anthropic Provider"""

from __future__ import annotations

import json
from collections.abc import AsyncGenerator
from typing import Any

import httpx

from app.ai.providers.base import (
    AIProvider,
    ChatMessage,
    ChatRequest,
    ChatResponse,
    EmbeddingRequest,
    EmbeddingResponse,
    MessageRole,
)
from app.config import get_settings


class AnthropicProvider(AIProvider):
    """Anthropic Claude API provider implementation."""

    def __init__(self, api_key: str | None = None, model: str | None = None):
        settings = get_settings()
        self.api_key = api_key or settings.ANTHROPIC_API_KEY
        self.model = model or settings.ANTHROPIC_MODEL
        self.base_url = "https://api.anthropic.com/v1"
        self._client: httpx.AsyncClient | None = None

    @property
    def provider_name(self) -> str:
        return "anthropic"

    def get_default_model(self) -> str:
        return self.model

    def get_embedding_model(self) -> str:
        # Anthropic doesn't have native embeddings; fall back to OpenAI
        return "text-embedding-3-small"

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers={
                    "x-api-key": self.api_key,
                    "Content-Type": "application/json",
                    "anthropic-version": "2023-06-01",
                },
                timeout=httpx.Timeout(120.0, connect=10.0),
            )
        return self._client

    def _convert_messages(
        self, messages: list[ChatMessage]
    ) -> tuple[str | None, list[dict[str, str]]]:
        """Convert to Anthropic format: separate system from messages."""
        system = None
        converted = []
        for msg in messages:
            if msg.role == MessageRole.SYSTEM:
                system = msg.content
            else:
                converted.append({"role": str(msg.role), "content": msg.content})
        return system, converted

    async def chat_complete(self, request: ChatRequest) -> ChatResponse:
        client = await self._get_client()
        model = request.model or self.model
        system, messages = self._convert_messages(request.messages)

        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
        }
        if system:
            payload["system"] = system

        response = await client.post("/messages", json=payload)
        response.raise_for_status()
        data = response.json()

        return ChatResponse(
            content=data["content"][0]["text"],
            model=data.get("model", model),
            usage=data.get("usage", {}),
            finish_reason=data.get("stop_reason"),
        )

    async def chat_complete_stream(
        self, request: ChatRequest
    ) -> AsyncGenerator[str, None]:
        client = await self._get_client()
        model = request.model or self.model
        system, messages = self._convert_messages(request.messages)

        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
            "stream": True,
        }
        if system:
            payload["system"] = system

        async with client.stream("POST", "/messages", json=payload) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    try:
                        event = json.loads(data)
                        if event.get("type") == "content_block_delta":
                            text = event.get("delta", {}).get("text", "")
                            if text:
                                yield text
                    except (json.JSONDecodeError, KeyError):
                        continue

    async def embed(self, request: EmbeddingRequest) -> EmbeddingResponse:
        """
        Anthropic doesn't provide embeddings natively.
        Falls back to OpenAI embedding provider.
        """
        from app.ai.providers.openai_provider import OpenAIProvider
        fallback = OpenAIProvider()
        return await fallback.embed(request)

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()
