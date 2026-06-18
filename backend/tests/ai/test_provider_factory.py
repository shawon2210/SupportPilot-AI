"""SupportPilot AI — AI Provider Factory Tests"""

from __future__ import annotations

import pytest

from app.ai.factory import ProviderFactory
from app.ai.providers.anthropic_provider import AnthropicProvider
from app.ai.providers.base import AIProvider
from app.ai.providers.deepseek_provider import DeepSeekProvider
from app.ai.providers.freekey_provider import FreeKeyProvider
from app.ai.providers.gemini_provider import GeminiProvider
from app.ai.providers.kimi_provider import KimiProvider
from app.ai.providers.openai_provider import OpenAIProvider
from app.ai.providers.openrouter_provider import OpenRouterProvider


class TestProviderFactory:
    """Test the AI provider factory."""

    def test_available_providers(self):
        """Test that all providers are registered."""
        providers = ProviderFactory.available_providers()
        assert "openai" in providers
        assert "anthropic" in providers
        assert "gemini" in providers
        assert "deepseek" in providers
        assert "openrouter" in providers
        assert "kimi" in providers
        assert "freekey" in providers

    def test_create_openai_provider(self):
        """Test creating an OpenAI provider."""
        provider = ProviderFactory.create("openai")
        assert isinstance(provider, OpenAIProvider)
        assert provider.provider_name == "openai"

    def test_create_anthropic_provider(self):
        """Test creating an Anthropic provider."""
        provider = ProviderFactory.create("anthropic")
        assert isinstance(provider, AnthropicProvider)
        assert provider.provider_name == "anthropic"

    def test_create_gemini_provider(self):
        """Test creating a Gemini provider."""
        provider = ProviderFactory.create("gemini")
        assert isinstance(provider, GeminiProvider)
        assert provider.provider_name == "gemini"

    def test_create_deepseek_provider(self):
        """Test creating a DeepSeek provider."""
        provider = ProviderFactory.create("deepseek")
        assert isinstance(provider, DeepSeekProvider)
        assert provider.provider_name == "deepseek"

    def test_create_openrouter_provider(self):
        """Test creating an OpenRouter provider."""
        provider = ProviderFactory.create("openrouter")
        assert isinstance(provider, OpenRouterProvider)
        assert provider.provider_name == "openrouter"

    def test_create_kimi_provider(self):
        """Test creating a Kimi provider."""
        provider = ProviderFactory.create("kimi")
        assert isinstance(provider, KimiProvider)
        assert provider.provider_name == "kimi"

    def test_create_freekey_provider(self):
        """Test creating a FreeKey provider."""
        provider = ProviderFactory.create("freekey")
        assert isinstance(provider, FreeKeyProvider)
        assert provider.provider_name == "freekey"

    def test_create_unknown_provider_raises(self):
        """Test that unknown provider raises ValueError."""
        with pytest.raises(ValueError, match="Unknown AI provider"):
            ProviderFactory.create("nonexistent")

    def test_all_providers_implement_base(self):
        """Test that all registered providers implement AIProvider."""
        for name in ProviderFactory.available_providers():
            provider = ProviderFactory.create(name)
            assert isinstance(provider, AIProvider)
