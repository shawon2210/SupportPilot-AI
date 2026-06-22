"use client";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchResult {
  chunk_id: string;
  source_id: string;
  content: string;
  chunk_index: number;
  similarity: number;
  metadata: string | null;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  total_results: number;
}

function SearchResultsSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-24" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-3 sm:p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20 rounded" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SearchPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const wsId = currentWorkspace?.id || "placeholder";
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState(5);
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery<SearchResponse>({
    queryKey: ["search", wsId, searchQuery, topK],
    queryFn: async () => {
      const res = await api.get<SearchResponse>(`/workspaces/${wsId}/search`, { query: searchQuery, top_k: String(topK) });
      return res;
    },
    enabled: searchQuery.length > 0,
  });

  useEffect(() => {
    if (isError && error) {
      const message = error instanceof Error ? error.message : "Search failed. Please try again.";
      toast.error(message);
    }
  }, [isError, error]);

  const results: SearchResult[] = data?.results || [];
  const hasSearched = searchQuery.length > 0;

  const handleSearch = () => {
    if (!query.trim()) return;
    setSearchQuery(query);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4 sm:px-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Semantic Search</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Search your knowledge base using AI-powered semantic search</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your knowledge base..." className="pl-10 h-9 sm:h-10" onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
        </div>
        <Button onClick={handleSearch} disabled={!query.trim()} className="h-9 sm:h-10 w-full sm:w-auto">
          Search
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-muted-foreground">Results:</label>
        <input type="range" min={1} max={20} value={topK} onChange={(e) => setTopK(Number(e.target.value))}
          className="w-24 sm:w-32 accent-primary" />
        <span className="text-sm font-medium">{topK}</span>
      </div>

      {isLoading && <SearchResultsSkeleton />}

      {isError && hasSearched && !isLoading && (
        <ErrorState
          title="Search failed"
          message={error instanceof Error ? error.message : "An error occurred while searching. Please try again."}
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && hasSearched && results.length === 0 && (
        <EmptyState
          icon={<Search className="h-12 w-12" />}
          title={`No results for "${searchQuery}"`}
          description="Try different keywords or check if your knowledge base has been populated."
          action={{ label: "Retry Search", onClick: () => refetch() }}
        />
      )}

      {!isLoading && !isError && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{results.length} results found</p>
          {results.map((r: SearchResult, i: number) => (
            <div key={i} className="rounded-lg border border-border bg-card p-3 sm:p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">Chunk #{r.chunk_index}</span>
                <span className="text-xs text-muted-foreground">Similarity: {(r.similarity * 100).toFixed(1)}%</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{r.content}</p>
            </div>
          ))}
        </div>
      )}

      {!hasSearched && (
        <EmptyState
          icon={<Search className="h-12 w-12" />}
          title="Search your knowledge base"
          description="Enter a query above to find relevant content using semantic search."
        />
      )}
    </div>
  );
}
