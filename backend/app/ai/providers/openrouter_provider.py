"""SupportPilot AI — OpenRouter Provider"""

from __future__ import annotations

from app.ai.providers.openai_provider import OpenAIProvider
from app.config import get_settings


class OpenRouterProvider(OpenAIProvider):
    """OpenRouter API provider — OpenAI-compatible with model routing."""

    def __init__(self):
        settings = get_settings()
        super().__init__(
            api_key=settings.OPENROUTER_API_KEY,
            model=settings.OPENROUTER_MODEL,
            base_url="https://openrouter.ai/api/v1",
        )

    @property
    def provider_name(self) -> str:
        return "openrouter"
