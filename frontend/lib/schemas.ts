import { z } from "zod";

export const WorkspacePlan = { FREE: "free", STARTER: "starter", PRO: "pro", ENTERPRISE: "enterprise" } as const;
export const WorkspaceRole = { OWNER: "owner", ADMIN: "admin", AGENT: "agent", MEMBER: "member" } as const;

export const workspaceSchema = z.object({ id: z.string(), name: z.string(), slug: z.string(), plan: z.string().default("free"), is_active: z.boolean().default(true), created_at: z.string().nullable().optional(), updated_at: z.string().nullable().optional() });
export const memberSchema = z.object({ id: z.string(), workspace_id: z.string(), user_id: z.string(), role: z.string(), is_active: z.boolean().default(true), joined_at: z.string().nullable().optional(), user_email: z.string().nullable().optional(), user_name: z.string().nullable().optional() });
export const knowledgeSourceSchema = z.object({ id: z.string(), workspace_id: z.string(), name: z.string(), source_type: z.string(), status: z.string().default("pending"), file_size: z.number().nullable().optional(), mime_type: z.string().nullable().optional(), url: z.string().nullable().optional(), error_message: z.string().nullable().optional(), created_at: z.string().nullable().optional(), updated_at: z.string().nullable().optional() });
export const chatSchema = z.object({ id: z.string(), workspace_id: z.string(), user_id: z.string().nullable().optional(), title: z.string().nullable().optional(), status: z.string().default("active"), created_at: z.string().nullable().optional(), updated_at: z.string().nullable().optional() });
export const messageSchema = z.object({ id: z.string(), chat_id: z.string(), workspace_id: z.string(), role: z.string(), content: z.string(), sources: z.array(z.any()).nullable().optional(), tokens_used: z.number().nullable().optional(), created_at: z.string().nullable().optional() });
export const chatWithMessagesSchema = chatSchema.extend({ messages: z.array(messageSchema).default([]) });
export const widgetConfigSchema = z.object({ id: z.string(), workspace_id: z.string(), theme: z.string().default("light"), primary_color: z.string().default("#3B82F6"), greeting_message: z.string().default("Hi! How can I help you?"), placeholder_text: z.string().default("Type your message..."), position: z.string().default("right"), show_branding: z.boolean().default(true), is_active: z.boolean().default(true) });
export const apiKeySchema = z.object({ id: z.string(), name: z.string(), key_prefix: z.string(), scopes: z.array(z.string()).default(["read", "write"]), is_active: z.boolean().default(true), created_at: z.string().nullable().optional(), expires_at: z.string().nullable().optional() });
export const webhookSchema = z.object({ id: z.string(), workspace_id: z.string(), url: z.string(), events: z.array(z.string()).default([]), is_active: z.boolean().default(true), description: z.string().nullable().optional(), failure_count: z.number().default(0), created_at: z.string().nullable().optional() });
export const subscriptionSchema = z.object({ id: z.string(), plan: z.string(), status: z.string(), current_period_start: z.string().nullable().optional(), current_period_end: z.string().nullable().optional(), cancel_at_period_end: z.boolean().default(false) });
export const auditLogSchema = z.object({ id: z.string(), action: z.string(), resource_type: z.string(), resource_id: z.string().nullable().optional(), user_id: z.string().nullable().optional(), details: z.string().nullable().optional(), ip_address: z.string().nullable().optional(), created_at: z.string().nullable().optional() });
export const knowledgeGapSchema = z.object({ id: z.string(), query: z.string(), occurrence_count: z.number(), status: z.string(), suggested_action: z.string().nullable().optional(), created_at: z.string().nullable().optional() });
export const searchResultSchema = z.object({ chunk_id: z.string(), source_id: z.string(), content: z.string(), chunk_index: z.number(), similarity: z.number(), metadata: z.string().nullable().optional() });
export const classificationSchema = z.object({ category: z.string(), priority: z.string(), tags: z.array(z.string()), confidence: z.number(), summary: z.string() });
export const escalationCheckSchema = z.object({ should_escalate: z.boolean(), confidence: z.number(), reason: z.string() });
export const suggestedReplySchema = z.object({ content: z.string(), confidence: z.number() });

export type Workspace = z.infer<typeof workspaceSchema>;
export type Member = z.infer<typeof memberSchema>;
export type KnowledgeSource = z.infer<typeof knowledgeSourceSchema>;
export type Chat = z.infer<typeof chatSchema>;
export type Message = z.infer<typeof messageSchema>;
export type ChatWithMessages = z.infer<typeof chatWithMessagesSchema>;
export type WidgetConfig = z.infer<typeof widgetConfigSchema>;
export type ApiKey = z.infer<typeof apiKeySchema>;
export type Webhook = z.infer<typeof webhookSchema>;
export type Subscription = z.infer<typeof subscriptionSchema>;
export type AuditLog = z.infer<typeof auditLogSchema>;
export type KnowledgeGap = z.infer<typeof knowledgeGapSchema>;
export type SearchResult = z.infer<typeof searchResultSchema>;
export type Classification = z.infer<typeof classificationSchema>;
export type EscalationCheck = z.infer<typeof escalationCheckSchema>;
export type SuggestedReply = z.infer<typeof suggestedReplySchema>;

export interface PaginatedResponse<T> { success: boolean; data: T[]; meta: { page: number; per_page: number; total: number; total_pages?: number }; }
export interface ApiResponse<T> { success: boolean; data: T; }
export interface ApiError { success: false; error: { code: string; message: string; details?: Record<string, unknown>[]; }; }
