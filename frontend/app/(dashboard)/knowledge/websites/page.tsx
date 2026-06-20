"use client";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Globe, Plus, Loader2, ExternalLink, Sparkles, Link2, ChevronRight } from "lucide-react";
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
    <div className="space-y-3 animate-fade-in">
      <Skeleton className="h-4 w-32" />
      {[1, 2].map((i) => (
        <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-xl border border-border/60 bg-card">
          <Skeleton className="h-10 w-10 rounded-xl" />
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
    <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-6 py-4 sm:py-6 animate-fade-in">
      {/* Header */}
      <div className="relative">
        <div className="absolute -inset-4 bg-gradient-to-br from-primary/5 via-transparent to-primary/[0.02] rounded-2xl blur-xl pointer-events-none" />
        <div className="relative flex items-start gap-3 sm:gap-4">
          <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/20 flex-shrink-0">
            <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Website Ingestion</h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-0.5">Crawl websites to build your knowledge base</p>
          </div>
        </div>
      </div>

      {/* Ingestion Form */}
      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-primary/30" />
        <div className="p-4 sm:p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Add Website</h2>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Website URL</label>
            <div className="relative">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/docs"
                className="pr-10 h-11"
              />
              {url && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Max Pages</label>
              <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded-md">{maxPages}</span>
            </div>
            <input
              type="range"
              min={1}
              max={500}
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value))}
              className="w-full accent-primary h-2 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>1</span>
              <span>250</span>
              <span>500</span>
            </div>
          </div>
          <Button
            onClick={() => ingestMutation.mutate()}
            disabled={!url || ingestMutation.isPending}
            className="w-full sm:w-auto active:scale-95 transition-transform"
          >
            {ingestMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Crawling...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Start Crawling
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && <WebsiteListSkeleton />}

      {/* Error State */}
      {isError && !isLoading && (
        <ErrorState
          title="Failed to load websites"
          message={error instanceof Error ? error.message : "An error occurred while fetching ingested websites."}
          onRetry={() => refetch()}
        />
      )}

      {/* Empty State */}
      {!isLoading && !isError && websites && websites.length === 0 && (
        <EmptyState
          icon={<Globe className="h-10 w-10" />}
          title="No websites ingested yet"
          description="Add a website URL above to start crawling and building your knowledge base from your documentation, guides, and pages."
          className="animate-fade-in"
        />
      )}

      {/* Website List */}
      {!isLoading && !isError && websites && websites.length > 0 && (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Ingested Websites
            </h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {websites.length} {websites.length === 1 ? "site" : "sites"}
            </span>
          </div>
          <div className="space-y-2">
            {websites.map((site, index) => (
              <div
                key={site.id}
                className="group relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-xl border border-border/60 bg-card hover:border-border hover:shadow-sm transition-all duration-200 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex-shrink-0">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{site.name}</p>
                  {site.url && (
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mt-0.5"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span className="truncate">{site.url}</span>
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={cn(
                    "text-xs px-2.5 py-1 rounded-full border font-medium",
                    getStatusColor(site.status)
                  )}>
                    {site.status}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {formatDate(site.created_at)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
