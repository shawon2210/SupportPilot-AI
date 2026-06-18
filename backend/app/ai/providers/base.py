"""SupportPilot AI — Abstract AI Provider Interface

This module defines the abstract base class that all AI providers must implement.
The provider pattern allows swapping AI vendors by changing only environment variables.
No business logic depends on a specific AI vendor.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


@dataclass
class ChatMessage:
    """A single message in a chat conversation."""
    role: MessageRole | str
    content: str

    def to_dict(self) -> dict[str, str]:
        return {"role": str(self.role), "content": self.content}


@dataclass
class ChatRequest:
    """Request for a chat completion."""
    messages: list[ChatMessage]
    model: str | None = None
    temperature: float = 0.7
    max_tokens: int = 2048
    stream: bool = False
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass
class ChatResponse:
    """Response from a chat completion."""
    content: str
    model: str
    usage: dict[str, int] = field(default_factory=dict)
    finish_reason: str | None = None
    sources: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class EmbeddingRequest:
    """Request for text embedding."""
    texts: list[str]
    model: str | None = None


@dataclass
class EmbeddingResponse:
    """Response from an embedding request."""
    embeddings: list[list[float]]
    model: str
    usage: dict[str, int] = field(default_factory=dict)


class AIProvider(ABC):
    """
    Abstract base class for all AI providers.
    
    Every provider must implement:
    - chat_complete: Non-streaming chat completion
    - chat_complete_stream: Streaming chat completion
    - embed: Text embedding generation
    - get_default_model: Default model name for this provider
    - get_embedding_model: Default embedding model name
    """

    @abstractmethod
    async def chat_complete(self, request: ChatRequest) -> ChatResponse:
        """Generate a non-streaming chat completion."""
        ...

    @abstractmethod
    async def chat_complete_stream(
        self, request: ChatRequest
    ) -> AsyncGenerator[str, None]:
        """Generate a streaming chat completion. Yields content chunks."""
        ...

    @abstractmethod
    async def embed(self, request: EmbeddingRequest) -> EmbeddingResponse:
        """Generate embeddings for a list of texts."""
        ...

    @abstractmethod
    def get_default_model(self) -> str:
        """Return the default chat model for this provider."""
        ...

    @abstractmethod
    def get_embedding_model(self) -> str:
        """Return the default embedding model for this provider."""
        ...

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return the provider identifier string."""
        ...

    def _merge_messages(
        self,
        system_prompt: str | None,
        messages: list[ChatMessage],
    ) -> list[ChatMessage]:
        """Prepend system prompt to messages if provided."""
        result = []
        if system_prompt:
            result.append(ChatMessage(role=MessageRole.SYSTEM, content=system_prompt))
        result.extend(messages)
        return result
