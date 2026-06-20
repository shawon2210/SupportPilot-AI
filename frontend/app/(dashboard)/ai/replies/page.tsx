"use client";

import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  MessageSquareText,
  Loader2,
  Copy,
  Check,
  Pencil,
  Sparkles,
  Bot,
  Send,
  Wand2,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores";
import type { SuggestedReply } from "@/lib/schemas";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/ui/error-state";
import { toast } from "sonner";

export default function RepliesPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const workspaceId = currentWorkspace?.id || "placeholder";

  const [chatId, setChatId] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedReply, setEditedReply] = useState("");

  const mutation = useMutation({
    mutationFn: async ({ cid, msg }: { cid: string; msg: string }) => {
      const res = await api.post<{ data: SuggestedReply }>(
        `/workspaces/${workspaceId}/ai/suggested-reply`,
        { chat_id: cid, message: msg }
      );
      return res.data;
    },
    onSuccess: (data) => {
      setEditedReply(data.content);
      setEditing(false);
    },
    onError: (err) => {
      toast.error((err as Error)?.message || "Failed to generate reply. Please try again.");
    },
  });

  const result = mutation.data;

  const handleCopy = useCallback(async () => {
    if (!result) return;
    const text = editing ? editedReply : result.content;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result, editing, editedReply]);

  const handleGenerate = () => {
    if (chatId.trim() && userMessage.trim()) {
      mutation.mutate({ cid: chatId.trim(), msg: userMessage.trim() });
    }
  };

  const confidencePct = result ? Math.round(result.confidence * 100) : 0;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-3xl px-4 sm:px-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500/30 to-blue-500/30 blur-md" />
            <div className="relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 shadow-lg shadow-violet-500/20">
              <MessageSquareText className="h-5 w-5 sm:h-5.5 sm:w-5.5 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Suggested Replies</h1>
            <p className="text-muted-foreground text-sm">
              Generate AI-powered reply suggestions for any conversation.
            </p>
          </div>
        </div>
      </div>

      {/* Input Card */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Send className="h-4 w-4 text-muted-foreground" />
            Compose Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="reply-chat-id" className="block text-sm font-medium">
              Chat ID
            </label>
            <Input
              id="reply-chat-id"
              type="text"
              placeholder="Enter the conversation / chat ID…"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              className="border-border/70"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="user-message" className="block text-sm font-medium">
              User Message
            </label>
            <Textarea
              id="user-message"
              className="min-h-[120px] border-border/70 resize-y"
              placeholder="Paste the user's latest message here…"
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!chatId.trim() || !userMessage.trim() || mutation.isPending}
            className="w-full sm:w-auto active:scale-95 transition-transform shadow-sm"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {mutation.isPending ? "Generating…" : "Generate Reply"}
          </Button>
        </CardContent>
      </Card>

      {/* Error */}
      {mutation.isError && (
        <div className="animate-slide-up">
          <ErrorState
            title="Generation Failed"
            message={(mutation.error as Error)?.message || "Failed to generate reply. Please try again."}
            onRetry={handleGenerate}
          />
        </div>
      )}

      {/* Empty State */}
      {!result && !mutation.isPending && !mutation.isError && (
        <div className="animate-fade-in">
          <div className="flex flex-col items-center justify-center text-center py-14 sm:py-16 px-6 rounded-xl border border-dashed border-border/60 bg-muted/10">
            <div className="relative mb-5">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500/15 to-blue-500/15 blur-xl" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/10 to-blue-500/10 border border-border/40">
                <Bot className="h-8 w-8 text-muted-foreground/60" />
              </div>
            </div>
            <h3 className="text-base font-semibold text-foreground/80 mb-1.5">
              No reply generated yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              Enter a chat ID and user message above, then click Generate to create an AI-powered reply suggestion.
            </p>
            <div className="flex items-center gap-1.5 mt-5 text-xs text-muted-foreground/60">
              <Wand2 className="h-3.5 w-3.5" />
              <span>Powered by AI</span>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {mutation.isPending && (
        <div className="animate-fade-in">
          <div className="flex flex-col items-center justify-center py-14 sm:py-16 px-6 rounded-xl border border-border/40 bg-muted/5">
            <div className="relative mb-5">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500/20 to-blue-500/20 blur-xl animate-pulse" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/10 to-blue-500/10 border border-border/30">
                <Sparkles className="h-7 w-7 text-violet-500/70 animate-pulse" />
              </div>
            </div>
            <p className="text-sm font-medium text-foreground/70">Generating your reply…</p>
            <p className="text-xs text-muted-foreground/60 mt-1">This may take a few seconds</p>
          </div>
        </div>
      )}

      {/* Result */}
      {result && !mutation.isPending && (
        <div className="animate-slide-up">
          <Card className="border-border/60 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/15 to-blue-500/15">
                    <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                  </div>
                  <CardTitle className="text-base sm:text-lg">Generated Reply</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-medium",
                      confidencePct >= 80
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/25"
                        : confidencePct >= 50
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/25"
                        : "bg-red-500/10 text-red-400 border-red-500/25"
                    )}
                  >
                    {confidencePct >= 80 ? "High" : confidencePct >= 50 ? "Medium" : "Low"} confidence
                  </Badge>
                  <span
                    className={cn(
                      "text-xs font-mono tabular-nums",
                      confidencePct >= 80
                        ? "text-emerald-500/70"
                        : confidencePct >= 50
                        ? "text-amber-500/70"
                        : "text-red-400/70"
                    )}
                  >
                    {confidencePct}%
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* Confidence bar */}
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700 ease-out",
                    confidencePct >= 80
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                      : confidencePct >= 50
                      ? "bg-gradient-to-r from-amber-500 to-amber-400"
                      : "bg-gradient-to-r from-red-500 to-red-400"
                  )}
                  style={{ width: `${confidencePct}%` }}
                />
              </div>

              {/* Reply content */}
              {editing ? (
                <Textarea
                  className="min-h-[140px] border-primary/40 focus:border-primary/60 resize-y"
                  value={editedReply}
                  onChange={(e) => setEditedReply(e.target.value)}
                />
              ) : (
                <div className="bg-muted/30 rounded-lg p-3 sm:p-4 border border-border/40">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.content}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="active:scale-95 transition-transform"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  variant={editing ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditing((e) => !e)}
                  className="active:scale-95 transition-transform"
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  {editing ? "Done Editing" : "Edit"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
