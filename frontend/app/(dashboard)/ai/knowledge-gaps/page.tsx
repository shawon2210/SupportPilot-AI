"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores";
import { cn, formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { toast } from "sonner";

type GapStatus = "all" | "open" | "resolved" | "ignored";

export default function KnowledgeGapsPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const wsId = currentWorkspace?.id || "placeholder";
  const [statusFilter, setStatusFilter] = useState<GapStatus>("all");
  const [minOccurrences, setMinOccurrences] = useState(3);
  const [days, setDays] = useState(30);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["knowledge-gaps", wsId, statusFilter],
    queryFn: async () => {
      try {
        const params: Record<string, string> = {};
        if (statusFilter !== "all") params.status = statusFilter;
        const res = await api.get<{ data: Array<{ id: string; query: string; occurrence_count: number; status: string; suggested_action: string | null; created_at: string | null }> }>(`/workspaces/${wsId}/ai/knowledge-gaps`, params);
        return res.data || [];
      } catch (e) {
        toast.error("Failed to load knowledge gaps");
        throw e;
      }
    },
  });

  const detectMutation = useMutation({
    mutationFn: async () => api.post(`/workspaces/${wsId}/ai/knowledge-gaps/detect`, { min_occurrences: minOccurrences, days }),
    onSuccess: () => { toast.success("Detection started"); refetch(); },
    onError: () => toast.error("Failed to start knowledge gap detection"),
  });

  const resolveMutation = useMutation({
    mutationFn: async (gapId: string) => api.post(`/workspaces/${wsId}/ai/knowledge-gaps/${gapId}/resolve`, {}),
    onSuccess: () => { toast.success("Gap marked as resolved"); refetch(); },
    onError: () => toast.error("Failed to resolve gap"),
  });

  const gaps = data || [];
  const openCount = gaps.filter((g) => g.status === "open").length;
  const resolvedCount = gaps.filter((g) => g.status === "resolved").length;
  const ignoredCount = gaps.filter((g) => g.status === "ignored").length;

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <ErrorState
          title="Failed to load knowledge gaps"
          message={(error as Error)?.message || "An unexpected error occurred"}
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Knowledge Gaps</h1>
          <p className="text-sm text-muted-foreground">Identify topics your knowledge base doesn&apos;t cover well</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-[10px] sm:text-xs text-muted-foreground">Open</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold">{openCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              <span className="text-[10px] sm:text-xs text-muted-foreground">Resolved</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold">{resolvedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] sm:text-xs text-muted-foreground">Ignored</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold">{ignoredCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Detect controls */}
      <Card>
        <CardContent className="p-3 sm:p-4 space-y-3">
          <h3 className="text-sm font-medium">Detect Gaps</h3>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1">Min Occurrences</label>
              <Input type="number" min={1} value={minOccurrences} onChange={(e) => setMinOccurrences(Number(e.target.value))} className="h-9" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1">Days</label>
              <Input type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-9" />
            </div>
            <div className="flex items-end">
              <Button onClick={() => detectMutation.mutate()} disabled={detectMutation.isPending} className="w-full sm:w-auto h-9">
                {detectMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                Detect
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as GapStatus)}>
        <TabsList className="w-full sm:w-auto overflow-x-auto scrollbar-hide">
          <TabsTrigger value="all" className="flex-1 sm:flex-none text-xs sm:text-sm">All ({gaps.length})</TabsTrigger>
          <TabsTrigger value="open" className="flex-1 sm:flex-none text-xs sm:text-sm">Open ({openCount})</TabsTrigger>
          <TabsTrigger value="resolved" className="flex-1 sm:flex-none text-xs sm:text-sm">Resolved ({resolvedCount})</TabsTrigger>
          <TabsTrigger value="ignored" className="flex-1 sm:flex-none text-xs sm:text-sm">Ignored ({ignoredCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-4 sm:p-6 space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
              </CardContent>
            </Card>
          ) : gaps.length === 0 ? (
            <EmptyState
              icon={<Search className="h-10 w-10 sm:h-12 sm:w-12" />}
              title="No knowledge gaps detected"
              description="Run gap detection to find missing topics in your knowledge base"
            />
          ) : (
            <>
              {/* Mobile: Card layout */}
              <div className="sm:hidden space-y-2">
                {gaps.map((gap) => (
                  <Card key={gap.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{gap.query}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={gap.status === "open" ? "destructive" : gap.status === "resolved" ? "default" : "secondary"} className="text-[10px]">
                              {gap.status}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{gap.occurrence_count} occurrences</span>
                          </div>
                          {gap.suggested_action && (
                            <p className="text-[10px] text-muted-foreground mt-1 truncate">{gap.suggested_action}</p>
                          )}
                        </div>
                        {gap.status === "open" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resolveMutation.mutate(gap.id)}
                            disabled={resolveMutation.isPending}
                            className="h-7 text-xs flex-shrink-0"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />Resolve
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop: Table layout */}
              <div className="hidden sm:block">
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                      <thead className="bg-muted/50">
                        <tr className="text-left text-xs text-muted-foreground">
                          <th className="px-4 py-3 font-medium">Query</th>
                          <th className="px-4 py-3 font-medium">Count</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium hidden md:table-cell">Suggested Action</th>
                          <th className="px-4 py-3 font-medium hidden lg:table-cell">Created</th>
                          <th className="px-4 py-3 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {gaps.map((gap) => (
                          <tr key={gap.id} className="border-t border-border hover:bg-muted/30">
                            <td className="px-4 py-3 text-sm font-medium max-w-xs truncate">{gap.query}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{gap.occurrence_count}</td>
                            <td className="px-4 py-3">
                              <Badge variant={gap.status === "open" ? "destructive" : gap.status === "resolved" ? "default" : "secondary"} className="text-xs">
                                {gap.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell max-w-xs truncate">{gap.suggested_action || "—"}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">{formatDate(gap.created_at)}</td>
                            <td className="px-4 py-3">
                              {gap.status === "open" && (
                                <Button variant="ghost" size="sm" onClick={() => resolveMutation.mutate(gap.id)} disabled={resolveMutation.isPending}>
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" />Resolve
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
