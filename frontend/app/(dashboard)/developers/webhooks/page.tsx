"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, Edit, Webhook, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores";
import { formatDate, cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";

const eventTypes = ["chat.created", "chat.message", "document.uploaded", "document.processed", "member.invited", "member.removed", "billing.checkout", "billing.subscription.updated", "billing.payment_failed", "widget.chat"];

function WebhookListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 rounded-lg border border-border bg-card">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-14 rounded-full" />
              </div>
              <div className="flex gap-1">
                <Skeleton className="h-5 w-20 rounded" />
                <Skeleton className="h-5 w-24 rounded" />
              </div>
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="flex gap-1">
              <Skeleton className="h-7 w-7 rounded-md" />
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WebhooksPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const wsId = currentWorkspace?.id || "placeholder";
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ url: "", events: [] as string[], description: "" });

  const { data: webhooks, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["webhooks", wsId],
    queryFn: async () => {
      const res = await api.get<Array<{ id: string; url: string; events: string[]; is_active: boolean; description: string | null; failure_count: number; created_at: string | null }>>(`/workspaces/${wsId}/webhooks`);
      return res || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => api.post(`/workspaces/${wsId}/webhooks`, { url: form.url, events: form.events, description: form.description }),
    onSuccess: () => {
      setShowCreate(false);
      setForm({ url: "", events: [], description: "" });
      refetch();
      toast.success("Webhook created successfully");
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to create webhook";
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/workspaces/${wsId}/webhooks/${id}`),
    onSuccess: () => {
      refetch();
      toast.success("Webhook deleted");
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to delete webhook";
      toast.error(message);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/workspaces/${wsId}/webhooks/${id}`, { is_active: isActive }),
    onSuccess: (_, variables) => {
      refetch();
      toast.success(variables.isActive ? "Webhook activated" : "Webhook deactivated");
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to toggle webhook";
      toast.error(message);
    },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Webhooks</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Configure webhook integrations for event notifications</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 flex items-center justify-center gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />Create Webhook
        </button>
      </div>

      {showCreate && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Webhook URL</label>
            <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://your-app.com/webhook" className="w-full px-4 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Events</label>
            <div className="flex flex-wrap gap-2">
              {eventTypes.map((evt) => (
                <button key={evt} onClick={() => setForm({ ...form, events: form.events.includes(evt) ? form.events.filter((e) => e !== evt) : [...form.events, evt] })}
                  className={cn("px-2 py-1 rounded-md text-xs border", form.events.includes(evt) ? "bg-primary/10 text-primary border-primary/20" : "border-border text-muted-foreground hover:bg-accent")}>
                  {evt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description (optional)</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Production webhook" className="w-full px-4 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={() => createMutation.mutate()} disabled={!form.url || form.events.length === 0 || createMutation.isPending}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 w-full sm:w-auto">
              {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Create
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-md border border-input text-sm hover:bg-accent w-full sm:w-auto">Cancel</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <WebhookListSkeleton />
      ) : isError ? (
        <ErrorState
          title="Failed to load webhooks"
          message={error instanceof Error ? error.message : "An error occurred while fetching webhooks."}
          onRetry={() => refetch()}
        />
      ) : (webhooks || []).length === 0 ? (
        <EmptyState
          icon={<Webhook className="h-12 w-12" />}
          title="No webhooks configured"
          description="Create your first webhook to receive event notifications from SupportPilot."
          action={{ label: "Create Webhook", onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="space-y-3">
          {(webhooks || []).map((wh) => (
            <div key={wh.id} className="p-4 rounded-lg border border-border bg-card">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Webhook className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <p className="text-sm font-medium truncate">{wh.url}</p>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full border", wh.is_active ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-gray-500/10 text-gray-400 border-gray-500/20")}>
                      {wh.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {wh.events.map((evt) => (
                      <span key={evt} className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{evt}</span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Created {formatDate(wh.created_at)}{wh.failure_count > 0 ? ` • ${wh.failure_count} failures` : ""}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => toggleMutation.mutate({ id: wh.id, isActive: !wh.is_active })} disabled={toggleMutation.isPending} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground disabled:opacity-50" title="Toggle">
                    {wh.is_active ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => deleteMutation.mutate(wh.id)} disabled={deleteMutation.isPending} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-50" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
