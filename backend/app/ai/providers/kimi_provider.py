"""SupportPilot AI — Kimi (Moonshot) Provider"""

from __future__ import annotations

from app.ai.providers.openai_provider import OpenAIProvider
from app.config import get_settings


class KimiProvider(OpenAIProvider):
    """Kimi/Moonshot API provider — OpenAI-compatible endpoint."""

    def __init__(self):
        settings = get_settings()
        super().__init__(
            api_key=settings.KIMI_API_KEY,
            model=settings.KIMI_MODEL,
            base_url=settings.KIMI_BASE_URL,
        )

    @property
    def provider_name(self) -> str:
        return "kimi"
