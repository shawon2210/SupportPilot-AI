"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowUpCircle, CheckCircle2, XCircle, Loader2, History, AlertTriangle, ShieldAlert } from "lucide-react";
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
    <div className="space-y-6 max-w-3xl px-4 sm:px-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold">Escalation Center</h1>
        </div>
        <p className="text-muted-foreground text-sm sm:text-base">
          Check whether a conversation should be escalated to a human agent.
        </p>
      </div>

      {/* Input Card */}
      <Card>
        <CardHeader>
          <CardTitle>Check Escalation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="chat-id" className="block text-sm font-medium">
              Chat ID
            </label>
            <Input
              id="chat-id"
              type="text"
              placeholder="Enter the conversation / chat ID…"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="threshold" className="text-sm font-medium">
                Confidence Threshold
              </label>
              <span className="text-sm font-semibold text-primary">{threshold}%</span>
            </div>
            <input
              id="threshold"
              type="range"
              min={0}
              max={100}
              step={5}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0% (Sensitive)</span>
              <span>100% (Strict)</span>
            </div>
          </div>

          <Button
            onClick={() => mutation.mutate(chatId)}
            disabled={!chatId.trim() || mutation.isPending}
            className="w-full sm:w-auto"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ArrowUpCircle className="h-4 w-4 mr-2" />
            )}
            {mutation.isPending ? "Checking…" : "Check Escalation"}
          </Button>
        </CardContent>
      </Card>

      {/* Error */}
      {mutation.isError && (
        <ErrorState
          title="Escalation Check Failed"
          message={(mutation.error as Error)?.message || "Escalation check failed. Please try again."}
          onRetry={() => mutation.mutate(chatId)}
        />
      )}

      {/* Result */}
      {result && (
        <Card className="animate-in fade-in">
          <CardHeader>
            <CardTitle>Escalation Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              {result.should_escalate ? (
                <>
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-500/10 border border-red-500/20">
                    <AlertTriangle className="h-6 w-6 text-red-400" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-red-400">Yes — Escalate</p>
                    <p className="text-xs text-muted-foreground">This conversation needs human attention</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-500/10 border border-green-500/20">
                    <CheckCircle2 className="h-6 w-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-400">No Escalation Needed</p>
                    <p className="text-xs text-muted-foreground">The AI can handle this conversation</p>
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confidence</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        result.confidence >= 0.8 ? "bg-green-500" : result.confidence >= 0.5 ? "bg-yellow-500" : "bg-red-500"
                      )}
                      style={{ width: `${Math.round(result.confidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{Math.round(result.confidence * 100)}%</span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reason</span>
                <p className="text-sm bg-muted/40 rounded-md p-2 border border-border/50">{result.reason}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Escalation History</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-md border border-border/60 hover:bg-accent/40 transition-colors gap-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {record.should_escalate ? (
                      <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{record.chatId}</p>
                      <p className="text-xs text-muted-foreground truncate">{record.reason}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 sm:ml-4">
                    <Badge
                      variant="outline"
                      className={cn(
                        record.should_escalate
                          ? "bg-red-500/10 text-red-400 border-red-500/20"
                          : "bg-green-500/10 text-green-400 border-green-500/20"
                      )}
                    >
                      {record.should_escalate ? "Escalate" : "No"}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDateTime(record.checkedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={<ShieldAlert className="h-10 w-10" />}
          title="No escalation checks yet"
          description="Run an escalation check to see results and build a history."
        />
      )}
    </div>
  );
}
