# SupportPilot AI — Entity Relationship Diagram

## Core Entities

```
┌──────────────┐       ┌───────────────────┐       ┌──────────────┐
│    users     │       │  workspace_members │       │  workspaces   │
├──────────────┤       ├───────────────────┤       ├──────────────┤
│ id (PK)      │──┐    │ id (PK)           │    ┌──│ id (PK)      │
│ email        │  └───>│ user_id (FK)      │    │  │ name         │
│ first_name   │       │ workspace_id (FK) │<───┘  │ slug (UQ)    │
│ last_name    │       │ role              │       │ plan         │
│ avatar_url   │       │ joined_at         │       │ settings     │
│ is_active    │       └───────────────────┘       │ stripe_ids   │
│ created_at   │                                   │ is_active    │
└──────────────┘                                   └──────┬───────┘
                                                         │
         ┌───────────────────────────────────────────────┼───────────────────────┐
         │                                               │                       │
         ▼                                               ▼                       ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐
│knowledge_sources│  │  document_chunks │  │      chats      │  │  widget_configs  │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤  ├──────────────────┤
│ id (PK)         │──│ source_id (FK)  │  │ id (PK)         │  │ workspace_id(FK) │
│ workspace_id(FK)│  │ workspace_id(FK)│  │ workspace_id(FK)│  │ theme            │
│ name            │  │ content         │  │ user_id (FK)    │  │ primary_color    │
│ source_type     │  │ chunk_index     │  │ title           │  │ greeting_msg     │
│ status          │  │ embedding_id    │  │ status          │  │ is_active        │
│ file_path       │  │ metadata        │  │ metadata        │  └──────────────────┘
│ metadata        │  └─────────────────┘  └────────┬────────┘
└─────────────────┘                                │
                                                   ▼
                                          ┌─────────────────┐
                                          │    messages     │
                                          ├─────────────────┤
                                          │ id (PK)         │
                                          │ chat_id (FK)    │
                                          │ workspace_id(FK)│
                                          │ role            │
                                          │ content         │
                                          │ sources         │
                                          │ tokens_used     │
                                          └─────────────────┘
```

## Supporting Entities

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    api_keys     │  │ usage_metrics   │  │   audit_logs    │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ workspace_id(FK)│  │ workspace_id(FK)│  │ workspace_id(FK)│
│ key_hash (UQ)   │  │ metric_name     │  │ user_id (FK)    │
│ key_prefix      │  │ metric_value    │  │ action          │
│ scopes          │  │ recorded_at     │  │ resource_type   │
│ expires_at      │  └─────────────────┘  │ resource_id     │
└─────────────────┘                       └─────────────────┘

┌──────────────────┐
│  subscriptions   │
├──────────────────┤
│ workspace_id(FK) │
│ stripe_sub_id    │
│ plan             │
│ status           │
│ period_start/end │
└──────────────────┘
```

## Relationships Summary

| Parent | Child | Type | On Delete |
|--------|-------|------|-----------|
| workspaces | workspace_members | 1:N | CASCADE |
| workspaces | knowledge_sources | 1:N | CASCADE |
| workspaces | document_chunks | 1:N | CASCADE |
| workspaces | chats | 1:N | CASCADE |
| workspaces | messages | 1:N | CASCADE |
| workspaces | widget_configs | 1:1 | CASCADE |
| workspaces | api_keys | 1:N | CASCADE |
| workspaces | usage_metrics | 1:N | CASCADE |
| workspaces | audit_logs | 1:N | CASCADE |
| workspaces | subscriptions | 1:1 | CASCADE |
| chats | messages | 1:N | CASCADE |
| knowledge_sources | document_chunks | 1:N | CASCADE |
| users | workspace_members | 1:N | CASCADE |
| users | chats | 1:N | SET NULL |
| users | audit_logs | 1:N | SET NULL |
