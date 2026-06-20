"""
SupportPilot AI — Application Settings

Uses pydantic-settings for type-safe environment variable management.
All sensitive values are loaded from environment variables.
Never hardcode secrets.
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Environment(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    TESTING = "testing"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ────────────────────────────────────────────
    APP_NAME: str = "SupportPilot AI"
    APP_VERSION: str = "0.1.0"
    APP_ENV: Environment = Environment.DEVELOPMENT
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    APP_URL: str = "http://localhost:8000"
    SECRET_KEY: str  # No default — app will crash if not set (prevents accidental deployment with known key)

    # ── Database ───────────────────────────────────────────────
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/supportpilot.db"
    DATABASE_ECHO: bool = False

    # ── Clerk Auth ─────────────────────────────────────────────
    CLERK_SECRET_KEY: str = ""
    CLERK_JWKS_URL: str = ""
    CLERK_WEBHOOK_SECRET: str = ""
    CLERK_PUBLISHABLE_KEY: str = ""

    # ── AI Provider Configuration ──────────────────────────────
    AI_PROVIDER: str = "openai"
    AI_EMBEDDING_MODEL: str = "text-embedding-3-small"

    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    # Anthropic
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"

    # Google Gemini
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # DeepSeek
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com/v1"
    DEEPSEEK_MODEL: str = "deepseek-chat"

    # OpenRouter
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "openai/gpt-4o-mini"

    # Kimi (Moonshot)
    KIMI_API_KEY: str = ""
    KIMI_BASE_URL: str = "https://api.moonshot.ai/v1"
    KIMI_MODEL: str = "moonshot-v1-8k"

    # FreeKey — custom OpenAI-compatible provider
    FREE_LLM_BASE_URL: str = ""
    FREE_LLM_API_KEY: str = ""
    FREE_LLM_MODEL: str = ""

    # ── File Storage ───────────────────────────────────────────
    STORAGE_BACKEND: str = "local"  # local | supabase
    UPLOAD_DIR: str = "./data/uploads"
    MAX_UPLOAD_SIZE_MB: int = 25

    # Supabase Storage
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_STORAGE_BUCKET: str = "supportpilot-files"

    # ── Stripe ─────────────────────────────────────────────────
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_STARTER: str = ""
    STRIPE_PRICE_PRO: str = ""

    # ── PostHog Analytics ──────────────────────────────────────
    POSTHOG_API_KEY: str = ""
    POSTHOG_HOST: str = "https://app.posthog.com"

    # ── Sentry ─────────────────────────────────────────────────
    SENTRY_DSN: str = ""

    # ── Redis (optional, for caching/rate limiting) ────────────
    REDIS_URL: str = ""

    # ── CORS ───────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # ── Platform Admin ─────────────────────────────────────────
    PLATFORM_ADMIN_USER_IDS: list[str] = []

    # ── Rate Limiting ──────────────────────────────────────────
    RATE_LIMIT_PER_MINUTE: int = 60

    # ── Slack ──────────────────────────────────────────────────
    SLACK_SIGNING_SECRET: str = ""
    SLACK_BOT_TOKEN: str = ""

    # ── Metrics ────────────────────────────────────────────────
    METRICS_ENABLED: bool = True

    # ── Logging ────────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"  # json | text

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def fix_database_url(cls, v: Any) -> str:
        """Convert postgresql:// to postgresql+asyncpg:// for SQLAlchemy."""
        if isinstance(v, str):
            if v.startswith("postgresql://"):
                return v.replace("postgresql://", "postgresql+asyncpg://", 1)
            if v.startswith("postgres://"):
                return v.replace("postgres://", "postgresql+asyncpg://", 1)
        return v

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            import json
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return [str(o).strip() for o in parsed]
            except (json.JSONDecodeError, ValueError):
                pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @field_validator("PLATFORM_ADMIN_USER_IDS", mode="before")
    @classmethod
    def parse_platform_admin_user_ids(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            return [user_id.strip() for user_id in v.split(",") if user_id.strip()]
        return v

    # ── Computed Properties ────────────────────────────────────
    @property
    def is_development(self) -> bool:
        return self.APP_ENV in (Environment.DEVELOPMENT, Environment.TESTING)

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == Environment.PRODUCTION

    @property
    def sqlite_url(self) -> str:
        return self.DATABASE_URL


# ── Singleton ──────────────────────────────────────────────────
_settings: Settings | None = None


def get_settings() -> Settings:
    """Get or create the settings singleton."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
