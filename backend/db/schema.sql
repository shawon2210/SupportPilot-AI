-- SupportPilot AI — Database Schema
-- Phase 1: Foundation (SQLite for dev, PostgreSQL for prod)
-- Uses UUIDs for all primary keys

-- Enable UUID extension (PostgreSQL only; SQLite uses TEXT)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- WORKSPACES
-- ============================================================
CREATE TABLE workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    settings TEXT DEFAULT '{}',  -- JSON blob for flexible settings
    plan TEXT NOT NULL DEFAULT 'free' CHECK(plan IN ('free', 'starter', 'pro', 'enterprise')),
    plan_limits TEXT DEFAULT '{}',  -- JSON blob for plan-specific limits
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workspaces_slug ON workspaces(slug);
CREATE INDEX idx_workspaces_stripe_customer ON workspaces(stripe_customer_id);

-- ============================================================
-- USERS (synced from Clerk via webhook)
-- ============================================================
CREATE TABLE users (
    id TEXT PRIMARY KEY,           -- Clerk user ID
    email TEXT NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================================
-- WORKSPACE MEMBERS (junction table with roles)
-- ============================================================
CREATE TABLE workspace_members (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'agent', 'member')),
    is_active BOOLEAN NOT NULL DEFAULT 1,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_role ON workspace_members(workspace_id, role);

-- ============================================================
-- KNOWLEDGE SOURCES (websites, files metadata)
-- ============================================================
CREATE TABLE knowledge_sources (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK(source_type IN ('pdf', 'docx', 'txt', 'markdown', 'website')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'ready', 'error')),
    file_path TEXT,                -- storage path (NULL for websites)
    file_size INTEGER,
    mime_type TEXT,
    url TEXT,                      -- for website sources
    metadata TEXT DEFAULT '{}',    -- JSON blob
    error_message TEXT,
    created_by TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_knowledge_sources_workspace ON knowledge_sources(workspace_id);
CREATE INDEX idx_knowledge_sources_status ON knowledge_sources(workspace_id, status);

-- ============================================================
-- DOCUMENT CHUNKS (text chunks for RAG)
-- ============================================================
CREATE TABLE document_chunks (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    source_id TEXT NOT NULL,
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    token_count INTEGER,
    metadata TEXT DEFAULT '{}',    -- JSON blob: page, line numbers, etc.
    embedding_id TEXT,             -- references vectors in pgvector
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (source_id) REFERENCES knowledge_sources(id) ON DELETE CASCADE
);

CREATE INDEX idx_document_chunks_workspace ON document_chunks(workspace_id);
CREATE INDEX idx_document_chunks_source ON document_chunks(source_id);

-- VECTOR TABLE (pgvector — in production, use vector column on document_chunks)
-- For SQLite dev, we store embeddings as JSON text
-- In PostgreSQL: ADD COLUMN embedding vector(1538);

-- ============================================================
-- CHATS (conversation sessions)
-- ============================================================
CREATE TABLE chats (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    user_id TEXT,
    title TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'closed', 'archived')),
    metadata TEXT DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_chats_workspace ON chats(workspace_id);
CREATE INDEX idx_chats_user ON chats(user_id);
CREATE INDEX idx_chats_status ON chats(workspace_id, status);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    sources TEXT DEFAULT '[]',    -- JSON array of source citations
    tokens_used INTEGER,
    metadata TEXT DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_chat ON messages(chat_id);
CREATE INDEX idx_messages_workspace ON messages(workspace_id);
CREATE INDEX idx_messages_created ON messages(chat_id, created_at);

-- ============================================================
-- WIDGET CONFIGS
-- ============================================================
CREATE TABLE widget_configs (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL UNIQUE,
    theme TEXT NOT NULL DEFAULT 'light' CHECK(theme IN ('light', 'dark', 'auto')),
    primary_color TEXT DEFAULT '#3B82F6',
    greeting_message TEXT DEFAULT 'Hi! How can I help you?',
    placeholder_text TEXT DEFAULT 'Type your message...',
    position TEXT NOT NULL DEFAULT 'right' CHECK(position IN ('left', 'right')),
    show_branding BOOLEAN NOT NULL DEFAULT 1,
    allowed_domains TEXT DEFAULT '[]',  -- JSON array
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- ============================================================
-- API KEYS
-- ============================================================
CREATE TABLE api_keys (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL,       -- first 8 chars for display
    scopes TEXT DEFAULT '["read", "write"]',  -- JSON array
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_by TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_api_keys_workspace ON api_keys(workspace_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- ============================================================
-- USAGE METRICS
-- ============================================================
CREATE TABLE usage_metrics (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL DEFAULT 0,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX idx_usage_metrics_workspace ON usage_metrics(workspace_id);
CREATE INDEX idx_usage_metrics_name ON usage_metrics(workspace_id, metric_name);
CREATE INDEX idx_usage_metrics_date ON usage_metrics(workspace_id, recorded_at);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    user_id TEXT,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details TEXT DEFAULT '{}',     -- JSON blob
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_logs_workspace ON audit_logs(workspace_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(workspace_id, action);
CREATE INDEX idx_audit_logs_created ON audit_logs(workspace_id, created_at);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TABLE subscriptions (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL UNIQUE,
    stripe_subscription_id TEXT,
    plan TEXT NOT NULL DEFAULT 'free' CHECK(plan IN ('free', 'starter', 'pro', 'enterprise')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'canceled', 'past_due', 'trialing')),
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- ============================================================
-- TRIGGERS (auto-update updated_at)
-- ============================================================
CREATE TRIGGER update_workspaces_timestamp
    AFTER UPDATE ON workspaces
    BEGIN
        UPDATE workspaces SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_users_timestamp
    AFTER UPDATE ON users
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_chats_timestamp
    AFTER UPDATE ON chats
    BEGIN
        UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
