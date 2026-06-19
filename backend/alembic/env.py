"""SupportPilot AI — Alembic Environment Configuration.

Supports both async (PostgreSQL/SQLite) and sync (offline) modes.
All models are imported so Alembic can detect schema changes.
"""
from __future__ import annotations

import asyncio
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# ── Add project root to path ──────────────────────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# ── Application imports ───────────────────────────────────────────
from app.config import get_settings
from app.core.database import Base

# Import ALL models so Alembic can detect them
from app.models import (  # noqa: F401
    ApiKey,
    AuditLog,
    Chat,
    DocumentChunk,
    KnowledgeGap,
    KnowledgeSource,
    Message,
    Subscription,
    UsageMetric,
    User,
    Webhook,
    WidgetConfig,
    Workspace,
    WorkspaceMember,
)

# ── Alembic Config ────────────────────────────────────────────────
config = context.config

# Override sqlalchemy.url from app settings
settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


# ── Offline migrations (generate SQL scripts) ────────────────────
def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode — outputs SQL without connecting."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


# ── Online migrations (connect to DB directly) ───────────────────
def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations against a live database using async engine."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode — connects to the database."""
    asyncio.run(run_async_migrations())


# ── Entry point ───────────────────────────────────────────────────
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
