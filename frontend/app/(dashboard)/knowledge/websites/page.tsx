"use client";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Globe, Plus, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores";
import { formatDate, getStatusColor } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function WebsiteListSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-32" />
      {[1, 2].map((i) => (
        <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-lg border border-border bg-card">
          <Skeleton className="h-5 w-5 rounded" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WebsitesPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const wsId = currentWorkspace?.id || "placeholder";
  const [url, setUrl] = useState("");
  const [maxPages, setMaxPages] = useState(50);

  const { data: websites, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["websites", wsId],
    queryFn: async () => {
      const res = await api.get<{ data: Array<{ id: string; name: string; source_type: string; status: string; url: string | null; created_at: string | null }> }>(`/workspaces/${wsId}/documents`, { source_type: "website" });
      return res.data || [];
    },
  });

  const ingestMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/workspaces/${wsId}/documents/website`, { url, name: new URL(url).hostname, max_pages: maxPages });
    },
    onSuccess: () => {
      setUrl("");
      refetch();
      toast.success("Website ingestion started");
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to start website ingestion";
      toast.error(message);
    },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-4 sm:px-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Website Ingestion</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Crawl websites to build your knowledge base</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 sm:p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Website URL</label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/docs" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Max Pages: {maxPages}</label>
          <input type="range" min={1} max={500} value={maxPages} onChange={(e) => setMaxPages(Number(e.target.value))} className="w-full accent-primary" />
        </div>
        <Button onClick={() => ingestMutation.mutate()} disabled={!url || ingestMutation.isPending} className="w-full sm:w-auto">
          {ingestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
          Start Crawling
        </Button>
      </div>

      {isLoading && <WebsiteListSkeleton />}

      {isError && !isLoading && (
        <ErrorState
          title="Failed to load websites"
          message={error instanceof Error ? error.message : "An error occurred while fetching ingested websites."}
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && websites && websites.length === 0 && (
        <EmptyState
          icon={<Globe className="h-12 w-12" />}
          title="No websites ingested"
          description="Add a website URL above to start crawling and building your knowledge base."
        />
      )}

      {!isLoading && !isError && websites && websites.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Ingested Websites</h3>
          {websites.map((site) => (
            <div key={site.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-lg border border-border bg-card">
              <Globe className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{site.name}</p>
                {site.url && <a href={site.url} target="_blank" className="text-xs text-primary hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" />{site.url}</a>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={cn("text-xs px-2 py-0.5 rounded-full border", getStatusColor(site.status))}>{site.status}</span>
                <span className="text-xs text-muted-foreground">{formatDate(site.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
