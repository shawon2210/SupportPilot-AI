"""SupportPilot AI — AI Providers Package"""

from app.ai.providers.anthropic_provider import AnthropicProvider
from app.ai.providers.base import (
    AIProvider,
    ChatMessage,
    ChatRequest,
    ChatResponse,
    EmbeddingRequest,
    EmbeddingResponse,
    MessageRole,
)
from app.ai.providers.deepseek_provider import DeepSeekProvider
from app.ai.providers.freekey_provider import FreeKeyProvider
from app.ai.providers.gemini_provider import GeminiProvider
from app.ai.providers.kimi_provider import KimiProvider
from app.ai.providers.openai_provider import OpenAIProvider
from app.ai.providers.openrouter_provider import OpenRouterProvider

__all__ = [
    "AIProvider",
    "AnthropicProvider",
    "ChatMessage",
    "ChatRequest",
    "ChatResponse",
    "DeepSeekProvider",
    "EmbeddingRequest",
    "EmbeddingResponse",
    "FreeKeyProvider",
    "GeminiProvider",
    "KimiProvider",
    "MessageRole",
    "OpenAIProvider",
    "OpenRouterProvider",
]
