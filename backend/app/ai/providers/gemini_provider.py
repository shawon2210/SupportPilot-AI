"""SupportPilot AI — Gemini Provider (Google)"""

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


class GeminiProvider(AIProvider):
    """Google Gemini API provider implementation."""

    def __init__(self, api_key: str | None = None, model: str | None = None):
        settings = get_settings()
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = model or settings.GEMINI_MODEL
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
        self._client: httpx.AsyncClient | None = None

    @property
    def provider_name(self) -> str:
        return "gemini"

    def get_default_model(self) -> str:
        return self.model

    def get_embedding_model(self) -> str:
        return "text-embedding-004"

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers={
                    "Content-Type": "application/json",
                    "x-goog-api-key": self.api_key,
                },
                timeout=httpx.Timeout(60.0, connect=10.0),
            )
        return self._client

    def _convert_messages(self, messages: list[ChatMessage]) -> tuple[str | None, list[dict]]:
        """Convert to Gemini format."""
        system = None
        converted = []
        for msg in messages:
            if msg.role == MessageRole.SYSTEM:
                system = msg.content
            else:
                role = "user" if msg.role == MessageRole.USER else "model"
                converted.append({"role": role, "parts": [{"text": msg.content}]})
        return system, converted

    async def chat_complete(self, request: ChatRequest) -> ChatResponse:
        client = await self._get_client()
        model = request.model or self.model
        system, contents = self._convert_messages(request.messages)

        payload: dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": request.temperature,
                "maxOutputTokens": request.max_tokens,
            },
        }
        if system:
            payload["systemInstruction"] = {"parts": [{"text": system}]}

        url = f"/models/{model}:generateContent"
        response = await client.post(url, json=payload)
        response.raise_for_status()
        data = response.json()

        candidate = data["candidates"][0]
        content = candidate["content"]["parts"][0]["text"]
        return ChatResponse(
            content=content,
            model=model,
            usage=data.get("usageMetadata", {}),
            finish_reason=candidate.get("finishReason"),
        )

    async def chat_complete_stream(
        self, request: ChatRequest
    ) -> AsyncGenerator[str, None]:
        client = await self._get_client()
        model = request.model or self.model
        system, contents = self._convert_messages(request.messages)

        payload: dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": request.temperature,
                "maxOutputTokens": request.max_tokens,
            },
        }
        if system:
            payload["systemInstruction"] = {"parts": [{"text": system}]}

        url = f"/models/{model}:streamGenerateContent?alt=sse"
        async with client.stream("POST", url, json=payload) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    try:
                        chunk = json.loads(data)
                        candidate = chunk.get("candidates", [{}])[0]
                        part = candidate.get("content", {}).get("parts", [{}])[0]
                        text = part.get("text", "")
                        if text:
                            yield text
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue

    async def embed(self, request: EmbeddingRequest) -> EmbeddingResponse:
        client = await self._get_client()
        model = request.model or self.get_embedding_model()

        all_embeddings = []
        for text in request.texts:
            payload = {
                "model": model,
                "content": {"parts": [{"text": text}]},
            }
            url = f"/models/{model}:embedContent"
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            all_embeddings.append(data["embedding"]["values"])

        return EmbeddingResponse(
            embeddings=all_embeddings,
            model=model,
        )

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()
