"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, Copy, Check, RefreshCw, Key, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

export default function ApiKeysPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const wsId = currentWorkspace?.id || "placeholder";
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: keys, isLoading, refetch, isError, error } = useQuery({
    queryKey: ["api-keys", wsId],
    queryFn: async () => {
      try {
        const res = await api.get<Array<{ id: string; name: string; key_prefix: string; scopes: string[]; is_active: boolean; created_at: string | null; expires_at: string | null }>>(`/workspaces/${wsId}/api-keys`);
        return res || [];
      } catch (err) {
        toast.error("Failed to load API keys");
        throw err;
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ id: string; name: string; key_prefix: string; scopes: string[]; is_active: boolean; created_at: string | null; expires_at: string | null; api_key: string }>(`/workspaces/${wsId}/api-keys`, { name: newName, scopes: ["read", "write"] });
      return res;
    },
    onSuccess: (data) => { setNewKey(data.api_key); setNewName(""); refetch(); },
    onError: () => { toast.error("Failed to create API key"); },
  });

  const revokeMutation = useMutation({
    mutationFn: async (keyId: string) => api.delete(`/workspaces/${wsId}/api-keys/${keyId}`),
    onSuccess: () => refetch(),
    onError: () => { toast.error("Failed to revoke API key"); },
  });

  const rotateMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const res = await api.post<{ api_key: string }>(`/workspaces/${wsId}/api-keys/${keyId}/rotate`);
      return res;
    },
    onSuccess: (data) => { setNewKey(data.api_key); refetch(); },
    onError: () => { toast.error("Failed to rotate API key"); },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">API Keys</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Manage API access for programmatic integration</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />Create Key
        </Button>
      </div>

      {newKey && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><Key className="h-4 w-4 text-primary" /><span className="text-sm font-medium">New API Key</span></div>
            <div className="flex flex-col sm:flex-row gap-2">
              <code className="flex-1 px-3 py-2 rounded-md bg-background text-xs font-mono break-all">{newKey}</code>
              <Button variant="outline" onClick={() => { navigator.clipboard.writeText(newKey); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="flex-shrink-0">
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Copy this key now. It won&apos;t be shown again.</p>
          </CardContent>
        </Card>
      )}

      {showCreate && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Key name (e.g., Production)" />
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={() => createMutation.mutate()} disabled={!newName || createMutation.isPending} className="w-full sm:w-auto">
                {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}Create
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)} className="w-full sm:w-auto">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-4">
                <Skeleton className="h-5 w-5 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Failed to load API keys"
          message={error?.message || "An error occurred while loading API keys."}
          onRetry={refetch}
        />
      ) : (keys || []).length === 0 ? (
        <EmptyState
          icon={<Key className="h-12 w-12" />}
          title="No API keys yet"
          description="Create your first API key to enable programmatic access."
          action={{ label: "Create Key", onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="space-y-3">
          {(keys || []).map((key) => (
            <Card key={key.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <Key className="h-5 w-5 text-muted-foreground flex-shrink-0 hidden sm:block" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{key.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{key.key_prefix}... • {key.scopes.join(", ")}</p>
                  <p className="text-xs text-muted-foreground">Created {formatDate(key.created_at)}{key.expires_at ? ` • Expires ${formatDate(key.expires_at)}` : ""}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => rotateMutation.mutate(key.id)} disabled={rotateMutation.isPending} title="Rotate">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => revokeMutation.mutate(key.id)} className="hover:text-destructive" title="Revoke">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
