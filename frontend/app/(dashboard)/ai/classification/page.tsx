"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Tag, AlertTriangle, BarChart3, Sparkles, Loader2, Info } from "lucide-react";
import { api } from "@/lib/api";
import { cn, getStatusColor } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores";
import type { Classification } from "@/lib/schemas";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/ui/error-state";
import { toast } from "sonner";

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Confidence</span>
        <span className="font-medium">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const PRIORITY_META: Record<string, { label: string; color: string; icon: typeof AlertTriangle }> = {
  urgent: { label: "Urgent", color: "bg-red-500/10 text-red-400 border-red-500/20", icon: AlertTriangle },
  high: { label: "High", color: "bg-orange-500/10 text-orange-400 border-orange-500/20", icon: AlertTriangle },
  medium: { label: "Medium", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", icon: Info },
  low: { label: "Low", color: "bg-green-500/10 text-green-400 border-green-500/20", icon: Info },
};

export default function ClassificationPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const workspaceId = currentWorkspace?.id || "placeholder";

  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await api.post<{ data: Classification }>(
        `/workspaces/${workspaceId}/ai/classify`,
        { message: text }
      );
      return res.data;
    },
    onError: (err) => {
      toast.error((err as Error)?.message || "Classification failed. Please try again.");
    },
  });

  const result = mutation.data;
  const priorityMeta = result ? PRIORITY_META[result.priority] || PRIORITY_META.medium : null;

  return (
    <div className="space-y-6 max-w-3xl px-4 sm:px-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold">Ticket Classification</h1>
        </div>
        <p className="text-muted-foreground text-sm sm:text-base">
          Paste a customer message to automatically classify its category, priority, and tags.
        </p>
      </div>

      {/* Input Card */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            className="min-h-[140px]"
            placeholder="Paste the customer's message here…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {message.length} characters
            </span>
            <Button
              onClick={() => mutation.mutate(message)}
              disabled={!message.trim() || mutation.isPending}
              className="w-full sm:w-auto"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Tag className="h-4 w-4 mr-2" />
              )}
              {mutation.isPending ? "Classifying…" : "Classify"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {mutation.isError && (
        <ErrorState
          title="Classification Failed"
          message={(mutation.error as Error)?.message || "Classification failed. Please try again."}
          onRetry={() => mutation.mutate(message)}
        />
      )}

      {/* Results Card */}
      {result && (
        <Card className="animate-in fade-in">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle>Classification Result</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category */}
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn(getStatusColor(result.category))}>
                    {result.category}
                  </Badge>
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Priority</span>
                <div className="flex items-center gap-2">
                  {priorityMeta && <priorityMeta.icon className="h-4 w-4 text-muted-foreground" />}
                  <Badge variant="outline" className={cn(priorityMeta?.color)}>
                    {priorityMeta?.label || result.priority}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Tags */}
            {result.tags.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tags</span>
                <div className="flex flex-wrap gap-2">
                  {result.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      <Tag className="h-3 w-3" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Confidence */}
            <ConfidenceBar value={result.confidence} />

            {/* Summary */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Summary</span>
              <p className="text-sm leading-relaxed bg-muted/40 rounded-md p-3 border border-border/50">
                {result.summary}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
