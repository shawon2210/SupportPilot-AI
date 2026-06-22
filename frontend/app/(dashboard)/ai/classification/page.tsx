"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Tag, AlertTriangle, BarChart3, Sparkles, Loader2, Info, Brain } from "lucide-react";
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
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";
  const label = pct >= 80 ? "High" : pct >= 50 ? "Medium" : "Low";
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Confidence Score</span>
        <span className="font-semibold">{pct}% <span className="font-normal text-muted-foreground">({label})</span></span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-700 ease-out", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const PRIORITY_META: Record<string, { label: string; color: string; icon: typeof AlertTriangle; bg: string }> = {
  urgent: { label: "Urgent", color: "text-red-500 border-red-500/20", icon: AlertTriangle, bg: "bg-red-500/10" },
  high: { label: "High", color: "text-orange-500 border-orange-500/20", icon: AlertTriangle, bg: "bg-orange-500/10" },
  medium: { label: "Medium", color: "text-yellow-500 border-yellow-500/20", icon: Info, bg: "bg-yellow-500/10" },
  low: { label: "Low", color: "text-emerald-500 border-emerald-500/20", icon: Info, bg: "bg-emerald-500/10" },
};

const exampleMessages = [
  "I've been charged twice for my subscription this month. Please refund the duplicate charge immediately!",
  "How do I integrate the API with my React application? I couldn't find the documentation.",
  "The dashboard is loading very slowly. Is there a performance issue on your end?",
];

export default function ClassificationPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const workspaceId = currentWorkspace?.id || "placeholder";
  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await api.post<{ data: Classification }>(`/workspaces/${workspaceId}/ai/classify`, { message: text });
      return res.data;
    },
    onError: (err) => {
      toast.error((err as Error)?.message || "Classification failed. Please try again.");
    },
  });

  const result = mutation.data;
  const priorityMeta = result ? PRIORITY_META[result.priority] || PRIORITY_META.medium : null;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-3xl px-3 sm:px-6 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
            <Brain className="h-4.5 w-4.5 text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Ticket Classification</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Paste a customer message to automatically classify its category, priority, and tags.
        </p>
      </div>

      {/* Input Card */}
      <Card>
        <CardHeader className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Customer Message
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
          <Textarea
            className="min-h-[120px] sm:min-h-[140px] resize-none"
            placeholder="Paste the customer's message here…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{message.length} characters</span>
              {message.length > 0 && message.length < 10 && (
                <span className="text-xs text-yellow-500">Too short for accurate classification</span>
              )}
            </div>
            <Button
              onClick={() => mutation.mutate(message)}
              disabled={!message.trim() || mutation.isPending}
              className="w-full sm:w-auto h-9 sm:h-10"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Tag className="h-4 w-4 mr-2" />
              )}
              {mutation.isPending ? "Classifying…" : "Classify"}
            </Button>
          </div>

          {/* Example messages */}
          {!result && !mutation.isPending && (
            <div className="pt-2 border-t border-border">
              <p className="text-[11px] text-muted-foreground mb-2">Try an example:</p>
              <div className="flex flex-wrap gap-2">
                {exampleMessages.map((msg, i) => (
                  <button
                    key={i}
                    onClick={() => setMessage(msg)}
                    className="text-[11px] text-left px-3 py-1.5 rounded-full border border-border hover:border-primary/30 hover:bg-accent/50 transition-colors line-clamp-1 max-w-[200px]"
                  >
                    {msg.slice(0, 50)}…
                  </button>
                ))}
              </div>
            </div>
          )}
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
        <Card className="animate-slide-up overflow-hidden">
          <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-transparent px-3 sm:px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">Classification Result</CardTitle>
            </div>
          </div>
          <CardContent className="px-3 sm:px-4 py-4 sm:py-5 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              {/* Category */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Category</span>
                <Badge variant="outline" className={cn("text-sm px-3 py-1", getStatusColor(result.category))}>
                  {result.category}
                </Badge>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Priority</span>
                <div className="flex items-center gap-2">
                  {priorityMeta && (
                    <div className={cn("h-7 w-7 rounded-full flex items-center justify-center", priorityMeta.bg)}>
                      <priorityMeta.icon className={cn("h-3.5 w-3.5", priorityMeta.color.split(" ")[0])} />
                    </div>
                  )}
                  <Badge variant="outline" className={cn("text-sm px-3 py-1", priorityMeta?.color)}>
                    {priorityMeta?.label || result.priority}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Tags */}
            {result.tags.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {result.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 text-xs px-2.5 py-1">
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
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">AI Summary</span>
              <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                <p className="text-sm leading-relaxed">{result.summary}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
