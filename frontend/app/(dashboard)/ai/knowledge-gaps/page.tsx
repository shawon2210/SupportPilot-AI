"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  CheckCircle,
  AlertTriangle,
  Loader2,
  BrainCircuit,
  Sparkles,
  Lightbulb,
  EyeOff,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores";
import { formatDate } from "@/lib/utils";
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
        const res = await api.get<{
          data: Array<{
            id: string;
            query: string;
            occurrence_count: number;
            status: string;
            suggested_action: string | null;
            created_at: string | null;
          }>;
        }>(`/workspaces/${wsId}/ai/knowledge-gaps`, params);
        return res.data || [];
      } catch (e) {
        toast.error("Failed to load knowledge gaps");
        throw e;
      }
    },
  });

  const detectMutation = useMutation({
    mutationFn: async () =>
      api.post(`/workspaces/${wsId}/ai/knowledge-gaps/detect`, {
        min_occurrences: minOccurrences,
        days,
      }),
    onSuccess: () => {
      toast.success("Detection started");
      refetch();
    },
    onError: () => toast.error("Failed to start knowledge gap detection"),
  });

  const resolveMutation = useMutation({
    mutationFn: async (gapId: string) =>
      api.post(`/workspaces/${wsId}/ai/knowledge-gaps/${gapId}/resolve`, {}),
    onSuccess: () => {
      toast.success("Gap marked as resolved");
      refetch();
    },
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
    <div className="max-w-4xl mx-auto px-3 sm:px-6 space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <BrainCircuit className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Knowledge Gaps
            </h1>
            <p className="text-sm text-muted-foreground">
              Identify topics your knowledge base doesn&apos;t cover well
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 animate-fade-up">
        <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="h-5 w-5 rounded-md bg-orange-500/10 flex items-center justify-center">
                <AlertTriangle className="h-3 w-3 text-orange-500" />
              </div>
              <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                Open
              </span>
            </div>
            <p className="text-lg sm:text-2xl font-bold tabular-nums">
              {openCount}
            </p>
          </CardContent>
        </Card>
        <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="h-5 w-5 rounded-md bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-3 w-3 text-green-500" />
              </div>
              <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                Resolved
              </span>
            </div>
            <p className="text-lg sm:text-2xl font-bold tabular-nums">
              {resolvedCount}
            </p>
          </CardContent>
        </Card>
        <Card className="border-muted-foreground/20 bg-gradient-to-br from-muted/30 to-transparent">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="h-5 w-5 rounded-md bg-muted-foreground/10 flex items-center justify-center">
                <EyeOff className="h-3 w-3 text-muted-foreground" />
              </div>
              <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                Ignored
              </span>
            </div>
            <p className="text-lg sm:text-2xl font-bold tabular-nums">
              {ignoredCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detect controls */}
      <Card className="animate-fade-up [animation-delay:50ms]">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-md bg-violet-500/10 flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-violet-500" />
            </div>
            <h3 className="text-sm font-semibold">Detect Gaps</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
                Min Occurrences
              </label>
              <Input
                type="number"
                min={1}
                value={minOccurrences}
                onChange={(e) => setMinOccurrences(Number(e.target.value))}
                className="h-9"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
                Days
              </label>
              <Input
                type="number"
                min={1}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="h-9"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => detectMutation.mutate()}
                disabled={detectMutation.isPending}
                className="w-full sm:w-auto h-9 active:scale-95"
              >
                {detectMutation.isPending && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                )}
                <Zap className="h-3.5 w-3.5 mr-1.5" />
                Detect
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="animate-fade-up [animation-delay:100ms]">
        <Tabs
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as GapStatus)}
        >
          <TabsList className="w-full sm:w-auto overflow-x-auto scrollbar-hide">
            <TabsTrigger
              value="all"
              className="flex-1 sm:flex-none text-xs sm:text-sm active:scale-95"
            >
              All ({gaps.length})
            </TabsTrigger>
            <TabsTrigger
              value="open"
              className="flex-1 sm:flex-none text-xs sm:text-sm active:scale-95"
            >
              Open ({openCount})
            </TabsTrigger>
            <TabsTrigger
              value="resolved"
              className="flex-1 sm:flex-none text-xs sm:text-sm active:scale-95"
            >
              Resolved ({resolvedCount})
            </TabsTrigger>
            <TabsTrigger
              value="ignored"
              className="flex-1 sm:flex-none text-xs sm:text-sm active:scale-95"
            >
              Ignored ({ignoredCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={statusFilter} className="mt-4">
            {isLoading ? (
              <Card>
                <CardContent className="p-4 sm:p-6 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton
                      key={i}
                      className="h-16 w-full animate-fade-in"
                      style={{ animationDelay: `${i * 50}ms` } as React.CSSProperties}
                    />
                  ))}
                </CardContent>
              </Card>
            ) : gaps.length === 0 ? (
              <EmptyState
                icon={
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 flex items-center justify-center">
                    <Lightbulb className="h-7 w-7 text-violet-400" />
                  </div>
                }
                title="No knowledge gaps detected"
                description="Run gap discovery to uncover missing topics in your knowledge base"
                action={{
                  label: "Run Detection",
                  onClick: () => detectMutation.mutate(),
                }}
              />
            ) : (
              <>
                {/* Mobile: Card layout */}
                <div className="sm:hidden space-y-2">
                  {gaps.map((gap, idx) => (
                    <Card
                      key={gap.id}
                      className="animate-fade-up active:scale-[0.98] transition-transform"
                      style={
                        { animationDelay: `${idx * 40}ms` } as React.CSSProperties
                      }
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {gap.query}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge
                                variant={
                                  gap.status === "open"
                                    ? "destructive"
                                    : gap.status === "resolved"
                                      ? "default"
                                      : "secondary"
                                }
                                className="text-[10px]"
                              >
                                {gap.status}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground tabular-nums">
                                {gap.occurrence_count} occurrences
                              </span>
                            </div>
                            {gap.suggested_action && (
                              <p className="text-[10px] text-muted-foreground mt-1.5 truncate">
                                {gap.suggested_action}
                              </p>
                            )}
                          </div>
                          {gap.status === "open" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resolveMutation.mutate(gap.id)}
                              disabled={resolveMutation.isPending}
                              className="h-7 text-xs flex-shrink-0 active:scale-95"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Resolve
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Desktop: Table layout */}
                <div className="hidden sm:block animate-fade-in">
                  <Card>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[400px]">
                        <thead className="bg-muted/50">
                          <tr className="text-left text-xs text-muted-foreground">
                            <th className="px-4 py-3 font-medium">Query</th>
                            <th className="px-4 py-3 font-medium">Count</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium hidden md:table-cell">
                              Suggested Action
                            </th>
                            <th className="px-4 py-3 font-medium hidden lg:table-cell">
                              Created
                            </th>
                            <th className="px-4 py-3 font-medium"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {gaps.map((gap, idx) => (
                            <tr
                              key={gap.id}
                              className="border-t border-border hover:bg-muted/30 transition-colors animate-fade-up"
                              style={
                                {
                                  animationDelay: `${idx * 30}ms`,
                                } as React.CSSProperties
                              }
                            >
                              <td className="px-4 py-3 text-sm font-medium max-w-xs truncate">
                                {gap.query}
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground tabular-nums">
                                {gap.occurrence_count}
                              </td>
                              <td className="px-4 py-3">
                                <Badge
                                  variant={
                                    gap.status === "open"
                                      ? "destructive"
                                      : gap.status === "resolved"
                                        ? "default"
                                        : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {gap.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell max-w-xs truncate">
                                {gap.suggested_action || "—"}
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
                                {formatDate(gap.created_at)}
                              </td>
                              <td className="px-4 py-3">
                                {gap.status === "open" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      resolveMutation.mutate(gap.id)
                                    }
                                    disabled={resolveMutation.isPending}
                                    className="active:scale-95"
                                  >
                                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                    Resolve
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
    </div>
  );
}
