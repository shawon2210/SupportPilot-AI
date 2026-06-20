"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowUpCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  History,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  MessageSquareText,
  SlidersHorizontal,
  ArrowRight,
  Clock,
  Gauge,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDateTime } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores";
import type { EscalationCheck } from "@/lib/schemas";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { toast } from "sonner";

interface EscalationRecord extends EscalationCheck {
  id: string;
  chatId: string;
  checkedAt: string;
}

export default function EscalationPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const workspaceId = currentWorkspace?.id || "placeholder";

  const [chatId, setChatId] = useState("");
  const [threshold, setThreshold] = useState(70);
  const [history, setHistory] = useState<EscalationRecord[]>([]);

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<{ data: EscalationCheck }>(
        `/workspaces/${workspaceId}/ai/escalation-check`,
        { chat_id: id, threshold: threshold / 100 }
      );
      return res.data;
    },
    onSuccess: (data) => {
      if (chatId.trim()) {
        setHistory((prev) => [
          {
            id: crypto.randomUUID(),
            chatId: chatId.trim(),
            should_escalate: data.should_escalate,
            confidence: data.confidence,
            reason: data.reason,
            checkedAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    },
    onError: (err) => {
      toast.error((err as Error)?.message || "Escalation check failed. Please try again.");
    },
  });

  const result = mutation.data;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-3xl px-4 sm:px-6 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-5 sm:p-7">
        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
        <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-primary/5 blur-xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 shadow-sm">
            <ShieldAlert className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Escalation Center</h1>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed max-w-lg">
              Check whether a conversation should be escalated to a human agent. Powered by AI confidence scoring.
            </p>
          </div>
        </div>
      </div>

      {/* ── Input Card ─────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <CardTitle>Run Escalation Check</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Chat ID Input */}
          <div className="space-y-2">
            <label htmlFor="chat-id" className="flex items-center gap-1.5 text-sm font-medium">
              <MessageSquareText className="h-3.5 w-3.5 text-muted-foreground" />
              Chat ID
            </label>
            <div className="relative">
              <Input
                id="chat-id"
                type="text"
                placeholder="Enter the conversation / chat ID…"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                className="h-11 pl-4 pr-4 bg-muted/30 border-border/60 focus:bg-background transition-colors"
              />
            </div>
          </div>

          {/* Threshold Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="threshold" className="flex items-center gap-1.5 text-sm font-medium">
                <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                Confidence Threshold
              </label>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
                <Gauge className="h-3 w-3" />
                {threshold}%
              </span>
            </div>
            <div className="relative pt-1">
              <input
                id="threshold"
                type="range"
                min={0}
                max={100}
                step={5}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full accent-primary h-2 rounded-full appearance-none bg-muted cursor-pointer"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500/60" />
                0% — Sensitive
              </span>
              <span className="flex items-center gap-1">
                100% — Strict
                <span className="h-1.5 w-1.5 rounded-full bg-red-500/60" />
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={() => mutation.mutate(chatId)}
            disabled={!chatId.trim() || mutation.isPending}
            className="w-full sm:w-auto h-11 px-6 active:scale-[0.97] transition-transform"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ArrowUpCircle className="h-4 w-4 mr-2" />
            )}
            {mutation.isPending ? "Analyzing…" : "Check Escalation"}
            {!mutation.isPending && chatId.trim() && (
              <ArrowRight className="h-3.5 w-3.5 ml-1.5 opacity-60" />
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ── Error ──────────────────────────────────────────────── */}
      {mutation.isError && (
        <div className="animate-fade-in">
          <ErrorState
            title="Escalation Check Failed"
            message={(mutation.error as Error)?.message || "Escalation check failed. Please try again."}
            onRetry={() => mutation.mutate(chatId)}
          />
        </div>
      )}

      {/* ── Result ─────────────────────────────────────────────── */}
      {result && (
        <Card
          className={cn(
            "animate-fade-in overflow-hidden border-2",
            result.should_escalate
              ? "border-red-500/20 shadow-red-500/5"
              : "border-green-500/20 shadow-green-500/5"
          )}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  result.should_escalate
                    ? "bg-red-500/10"
                    : "bg-green-500/10"
                )}
              >
                {result.should_escalate ? (
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                )}
              </div>
              <CardTitle>Escalation Result</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Verdict Banner */}
            <div
              className={cn(
                "flex items-center gap-4 rounded-xl p-4 border",
                result.should_escalate
                  ? "bg-red-500/5 border-red-500/15"
                  : "bg-green-500/5 border-green-500/15"
              )}
            >
              <div
                className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border",
                  result.should_escalate
                    ? "bg-red-500/10 border-red-500/20"
                    : "bg-green-500/10 border-green-500/20"
                )}
              >
                {result.should_escalate ? (
                  <AlertTriangle className="h-7 w-7 text-red-400" />
                ) : (
                  <CheckCircle2 className="h-7 w-7 text-green-400" />
                )}
              </div>
              <div>
                <p
                  className={cn(
                    "text-lg font-bold",
                    result.should_escalate ? "text-red-400" : "text-green-400"
                  )}
                >
                  {result.should_escalate ? "Yes — Escalate" : "No Escalation Needed"}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {result.should_escalate
                    ? "This conversation needs human attention"
                    : "The AI can handle this conversation"}
                </p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Confidence Bar */}
              <div className="space-y-2.5 rounded-xl bg-muted/20 border border-border/40 p-4">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <Gauge className="h-3 w-3" />
                  Confidence
                </span>
                <div className="flex items-center gap-3">
                  <div className="h-2.5 flex-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700 ease-out",
                        result.confidence >= 0.8
                          ? "bg-gradient-to-r from-green-500 to-green-400"
                          : result.confidence >= 0.5
                            ? "bg-gradient-to-r from-yellow-500 to-yellow-400"
                            : "bg-gradient-to-r from-red-500 to-red-400"
                      )}
                      style={{ width: `${Math.round(result.confidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold tabular-nums">
                    {Math.round(result.confidence * 100)}%
                  </span>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-2.5 rounded-xl bg-muted/20 border border-border/40 p-4">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <MessageSquareText className="h-3 w-3" />
                  Reason
                </span>
                <p className="text-sm leading-relaxed">{result.reason}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── History ────────────────────────────────────────────── */}
      {history.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <History className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle>Escalation History</CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs font-medium">
                {history.length} check{history.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((record, index) => (
                <div
                  key={record.id}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 rounded-xl border border-border/50 hover:bg-accent/30 hover:border-border/80 transition-all duration-200 gap-2",
                    index === 0 && "animate-fade-in"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        record.should_escalate
                          ? "bg-red-500/10"
                          : "bg-green-500/10"
                      )}
                    >
                      {record.should_escalate ? (
                        <XCircle className="h-4 w-4 text-red-400" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{record.chatId}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{record.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:ml-4 shrink-0">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs font-medium",
                        record.should_escalate
                          ? "bg-red-500/10 text-red-400 border-red-500/20"
                          : "bg-green-500/10 text-green-400 border-green-500/20"
                      )}
                    >
                      {record.should_escalate ? "Escalate" : "No"}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(record.checkedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={
            <div className="relative">
              <ShieldAlert className="h-10 w-10" />
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary/20 animate-pulse" />
            </div>
          }
          title="No escalation checks yet"
          description="Run an escalation check above to see results and build a history. The AI will analyze the conversation and recommend whether it needs human attention."
        />
      )}
    </div>
  );
}
