"""SupportPilot AI — AI Provider Factory

Creates the appropriate AI provider based on the AI_PROVIDER environment variable.
This is the single point of provider instantiation in the application.
"""

from __future__ import annotations

from app.ai.providers.base import AIProvider
from app.config import get_settings


class ProviderFactory:
    """
    Factory for creating AI provider instances.
    
    Usage:
        provider = ProviderFactory.create()  # Uses AI_PROVIDER env var
        response = await provider.chat_complete(request)
    """

    _providers: dict[str, type[AIProvider]] = {}

    @classmethod
    def register(cls, name: str, provider_class: type[AIProvider]) -> None:
        """Register a provider class."""
        cls._providers[name.lower()] = provider_class

    @classmethod
    def create(cls, provider_name: str | None = None) -> AIProvider:
        """
        Create a provider instance.
        If provider_name is None, uses the AI_PROVIDER env var.
        """
        if provider_name is None:
            settings = get_settings()
            provider_name = settings.AI_PROVIDER

        name = provider_name.lower()

        if name not in cls._providers:
            raise ValueError(
                f"Unknown AI provider: '{name}'. "
                f"Available: {list(cls._providers.keys())}"
            )

        return cls._providers[name]()

    @classmethod
    def available_providers(cls) -> list[str]:
        """List all registered provider names."""
        return list(cls._providers.keys())


# ── Register all built-in providers ──────────────────────────────
from app.ai.providers.anthropic_provider import AnthropicProvider
from app.ai.providers.deepseek_provider import DeepSeekProvider
from app.ai.providers.freekey_provider import FreeKeyProvider
from app.ai.providers.gemini_provider import GeminiProvider
from app.ai.providers.kimi_provider import KimiProvider
from app.ai.providers.mock_provider import MockProvider
from app.ai.providers.openai_provider import OpenAIProvider
from app.ai.providers.openrouter_provider import OpenRouterProvider

ProviderFactory.register("openai", OpenAIProvider)
ProviderFactory.register("anthropic", AnthropicProvider)
ProviderFactory.register("gemini", GeminiProvider)
ProviderFactory.register("deepseek", DeepSeekProvider)
ProviderFactory.register("openrouter", OpenRouterProvider)
ProviderFactory.register("kimi", KimiProvider)
ProviderFactory.register("freekey", FreeKeyProvider)
ProviderFactory.register("mock", MockProvider)
