"""SupportPilot AI — OpenAI Provider"""

from __future__ import annotations

import json
from collections.abc import AsyncGenerator

import httpx

from app.ai.providers.base import (
    AIProvider,
    ChatRequest,
    ChatResponse,
    EmbeddingRequest,
    EmbeddingResponse,
)
from app.config import get_settings


class OpenAIProvider(AIProvider):
    """OpenAI API provider implementation."""

    def __init__(self, api_key: str | None = None, model: str | None = None, base_url: str | None = None):
        settings = get_settings()
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = model or settings.OPENAI_MODEL
        self.base_url = base_url or "https://api.openai.com/v1"
        self._client: httpx.AsyncClient | None = None

    @property
    def provider_name(self) -> str:
        return "openai"

    def get_default_model(self) -> str:
        return self.model

    def get_embedding_model(self) -> str:
        from app.config import get_settings
        return get_settings().AI_EMBEDDING_MODEL

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                timeout=httpx.Timeout(60.0, connect=10.0),
            )
        return self._client

    async def chat_complete(self, request: ChatRequest) -> ChatResponse:
        client = await self._get_client()
        model = request.model or self.model

        payload = {
            "model": model,
            "messages": [m.to_dict() for m in request.messages],
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            **request.extra,
        }

        response = await client.post("/chat/completions", json=payload)
        response.raise_for_status()
        data = response.json()

        choice = data["choices"][0]
        return ChatResponse(
            content=choice["message"]["content"],
            model=data.get("model", model),
            usage=data.get("usage", {}),
            finish_reason=choice.get("finish_reason"),
        )

    async def chat_complete_stream(
        self, request: ChatRequest
    ) -> AsyncGenerator[str, None]:
        client = await self._get_client()
        model = request.model or self.model

        payload = {
            "model": model,
            "messages": [m.to_dict() for m in request.messages],
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "stream": True,
            **request.extra,
        }

        async with client.stream("POST", "/chat/completions", json=payload) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        return
                    try:
                        chunk = json.loads(data)
                        delta = chunk["choices"][0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue

    async def embed(self, request: EmbeddingRequest) -> EmbeddingResponse:
        client = await self._get_client()
        model = request.model or self.get_embedding_model()

        payload = {
            "model": model,
            "input": request.texts,
        }

        response = await client.post("/embeddings", json=payload)
        response.raise_for_status()
        data = response.json()

        embeddings = [item["embedding"] for item in sorted(data["data"], key=lambda x: x["index"])]
        return EmbeddingResponse(
            embeddings=embeddings,
            model=data.get("model", model),
            usage=data.get("usage", {}),
        )

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()
