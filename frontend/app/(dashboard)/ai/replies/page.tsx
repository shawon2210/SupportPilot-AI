"use client";

import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { MessageSquareText, Loader2, Copy, Check, Pencil, Sparkles } from "lucide-react";
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
      // fallback
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
    <div className="space-y-6 max-w-3xl px-4 sm:px-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <MessageSquareText className="h-5 w-5 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold">Suggested Replies</h1>
        </div>
        <p className="text-muted-foreground text-sm sm:text-base">
          Generate AI-powered reply suggestions for any conversation.
        </p>
      </div>

      {/* Input Card */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Reply</CardTitle>
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
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="user-message" className="block text-sm font-medium">
              User Message
            </label>
            <Textarea
              id="user-message"
              className="min-h-[120px]"
              placeholder="Paste the user's latest message here…"
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!chatId.trim() || !userMessage.trim() || mutation.isPending}
            className="w-full sm:w-auto"
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
        <ErrorState
          title="Generation Failed"
          message={(mutation.error as Error)?.message || "Failed to generate reply. Please try again."}
          onRetry={handleGenerate}
        />
      )}

      {/* Result */}
      {result && (
        <Card className="animate-in fade-in">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <CardTitle>Generated Reply</CardTitle>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  confidencePct >= 80
                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                    : confidencePct >= 50
                    ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                    : "bg-red-500/10 text-red-400 border-red-500/20"
                )}
              >
                {confidencePct}% confidence
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Confidence bar */}
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  confidencePct >= 80 ? "bg-green-500" : confidencePct >= 50 ? "bg-yellow-500" : "bg-red-500"
                )}
                style={{ width: `${confidencePct}%` }}
              />
            </div>

            {/* Reply content */}
            {editing ? (
              <Textarea
                className="min-h-[140px] border-primary/40"
                value={editedReply}
                onChange={(e) => setEditedReply(e.target.value)}
              />
            ) : (
              <div className="bg-muted/40 rounded-md p-3 sm:p-4 border border-border/50">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.content}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1.5 text-green-400" />
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
              >
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                {editing ? "Done Editing" : "Edit"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
