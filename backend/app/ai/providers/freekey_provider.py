"""SupportPilot AI — FreeKey Provider (Custom OpenAI-Compatible)"""

from __future__ import annotations

from app.ai.providers.openai_provider import OpenAIProvider
from app.config import get_settings


class FreeKeyProvider(OpenAIProvider):
    """
    Custom OpenAI-compatible provider.
    Allows using any OpenAI API-compatible endpoint by configuring:
    - FREE_LLM_BASE_URL
    - FREE_LLM_API_KEY
    - FREE_LLM_MODEL
    """

    def __init__(self):
        settings = get_settings()
        super().__init__(
            api_key=settings.FREE_LLM_API_KEY,
            model=settings.FREE_LLM_MODEL,
            base_url=settings.FREE_LLM_BASE_URL,
        )

    @property
    def provider_name(self) -> str:
        return "freekey"
