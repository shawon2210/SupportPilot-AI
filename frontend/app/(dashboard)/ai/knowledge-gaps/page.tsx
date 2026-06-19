"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores";
import { cn, formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Knowledge Gaps</h1>
          <p className="text-sm text-muted-foreground">Identify topics your knowledge base doesn&apos;t cover well</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4 text-orange-500" /><span className="text-xs text-muted-foreground">Open</span></div>
            <p className="text-xl sm:text-2xl font-bold">{openCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><CheckCircle className="h-4 w-4 text-green-500" /><span className="text-xs text-muted-foreground">Resolved</span></div>
            <p className="text-xl sm:text-2xl font-bold">{resolvedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Search className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Ignored</span></div>
            <p className="text-xl sm:text-2xl font-bold">{ignoredCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-medium">Detect Gaps</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1">Min Occurrences</label>
              <Input type="number" min={1} value={minOccurrences} onChange={(e) => setMinOccurrences(Number(e.target.value))} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1">Days</label>
              <Input type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value))} />
            </div>
            <div className="flex items-end">
              <Button onClick={() => detectMutation.mutate()} disabled={detectMutation.isPending} className="w-full sm:w-auto">
                {detectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Detect
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as GapStatus)}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="all" className="flex-1 sm:flex-none">All ({gaps.length})</TabsTrigger>
          <TabsTrigger value="open" className="flex-1 sm:flex-none">Open ({openCount})</TabsTrigger>
          <TabsTrigger value="resolved" className="flex-1 sm:flex-none">Resolved ({resolvedCount})</TabsTrigger>
          <TabsTrigger value="ignored" className="flex-1 sm:flex-none">Ignored ({ignoredCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-4">
          {isLoading ? (
            <Card><CardContent className="p-6 space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</CardContent></Card>
          ) : gaps.length === 0 ? (
            <EmptyState
              icon={<Search className="h-12 w-12" />}
              title="No knowledge gaps detected"
              description="Run gap detection to find missing topics in your knowledge base"
            />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-muted/50">
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Query</th>
                      <th className="px-4 py-3 font-medium hidden sm:table-cell">Count</th>
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
                        <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{gap.occurrence_count}</td>
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
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
