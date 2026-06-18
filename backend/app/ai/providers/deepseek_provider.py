"""SupportPilot AI — DeepSeek Provider"""

from __future__ import annotations

from app.ai.providers.openai_provider import OpenAIProvider
from app.config import get_settings


class DeepSeekProvider(OpenAIProvider):
    """DeepSeek API provider — OpenAI-compatible endpoint."""

    def __init__(self):
        settings = get_settings()
        super().__init__(
            api_key=settings.DEEPSEEK_API_KEY,
            model=settings.DEEPSEEK_MODEL,
            base_url=settings.DEEPSEEK_BASE_URL,
        )

    @property
    def provider_name(self) -> str:
        return "deepseek"
