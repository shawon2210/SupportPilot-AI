"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Clock,
  Sparkles,
  X,
  Bot,
  Zap,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores";
import { cn, formatRelative, truncate, getStatusColor } from "@/lib/utils";
import type { Chat, PaginatedResponse } from "@/lib/schemas";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

/* ─── Status dot colour map ─────────────────────────────────── */
const statusDotColor: Record<string, string> = {
  active: "bg-emerald-500",
  ready: "bg-emerald-500",
  completed: "bg-emerald-500",
  succeeded: "bg-emerald-500",
  pending: "bg-amber-500",
  processing: "bg-amber-500",
  trialing: "bg-amber-500",
  failed: "bg-red-500",
  error: "bg-red-500",
  canceled: "bg-red-500",
  cancelled: "bg-red-500",
  past_due: "bg-orange-500",
};

function StatusDot({ status }: { status: string }) {
  const color = statusDotColor[status] ?? "bg-gray-400";
  return (
    <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
      {(status === "active" || status === "processing") && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
            color
          )}
        />
      )}
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", color)} />
    </span>
  );
}

/* ─── Inline delete undo state ──────────────────────────────── */
interface PendingDelete {
  chatId: string;
  chatTitle: string;
  timeoutId: ReturnType<typeof setTimeout>;
}

export default function ChatListPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspaceStore();
  const workspaceId = currentWorkspace?.id || "";

  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* ─── Queries & Mutations (unchanged logic) ──────────────── */
  const { data, isLoading, isError, error, refetch } =
    useQuery<PaginatedResponse<Chat>>({
      queryKey: ["chats", workspaceId],
      queryFn: async () => {
        try {
          return api.get<PaginatedResponse<Chat>>(
            `/workspaces/${workspaceId}/chats`
          );
        } catch (e) {
          toast.error("Failed to load chats");
          throw e;
        }
      },
      enabled: !!workspaceId,
    });

  const createMutation = useMutation({
    mutationFn: (title: string) =>
      api.post<Chat>(`/workspaces/${workspaceId}/chats`, { title }),
    onSuccess: () => {
      toast.success("Chat created");
      queryClient.invalidateQueries({ queryKey: ["chats", workspaceId] });
    },
    onError: () => toast.error("Failed to create chat"),
  });

  const deleteMutation = useMutation({
    mutationFn: (chatId: string) =>
      api.delete(`/workspaces/${workspaceId}/chats/${chatId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats", workspaceId] });
    },
    onError: () => toast.error("Failed to delete chat"),
  });

  /* ─── Handlers ───────────────────────────────────────────── */
  const handleCreate = () => {
    const title = newChatTitle.trim() || "New Chat";
    createMutation.mutate(title);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCreate();
    if (e.key === "Escape") {
      setShowCreateDialog(false);
      setNewChatTitle("");
    }
  };

  const handleDelete = useCallback(
    (chat: Chat) => {
      // Cancel any existing pending delete
      if (pendingDelete) {
        clearTimeout(pendingDelete.timeoutId);
      }

      const chatTitle = chat.title || "Untitled Chat";
      const chatId = chat.id;

      // Optimistically remove from UI
      const previousData = queryClient.getQueryData<PaginatedResponse<Chat>>([
        "chats",
        workspaceId,
      ]);

      if (previousData) {
        queryClient.setQueryData(["chats", workspaceId], {
          ...previousData,
          data: previousData.data.filter((c) => c.id !== chatId),
        });
      }

      // Create the timeout first so the undo callback can reference it
      const timeoutId = setTimeout(() => {
        deleteMutation.mutate(chatId);
        setPendingDelete(null);
      }, 6000);

      // Show undo toast
      toast("Chat deleted", {
        description: `"${truncate(chatTitle, 40)}" has been removed`,
        action: {
          label: "Undo",
          onClick: () => {
            clearTimeout(timeoutId);
            setPendingDelete(null);
            if (previousData) {
              queryClient.setQueryData(["chats", workspaceId], previousData);
            }
            toast.success("Chat restored");
          },
        },
        duration: 6000,
      });

      setPendingDelete({ chatId, chatTitle, timeoutId });
    },
    [pendingDelete, queryClient, workspaceId, deleteMutation]
  );
  /* ─── Error state ────────────────────────────────────────── */
  if (isError) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 animate-fade-in">
        <ErrorState
          title="Failed to load chats"
          message={(error as Error)?.message || "An unexpected error occurred"}
          onRetry={refetch}
        />
      </div>
    );
  }

  const chats = data?.data || [];
  const filteredChats = searchQuery
    ? chats.filter((c) =>
        c.title?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : chats;

  /* ─── Render ─────────────────────────────────────────────── */
  return (
    <div
      className={cn(
        "max-w-4xl mx-auto space-y-5 sm:space-y-6 px-3 sm:px-4 pb-8",
        mounted && "animate-fade-in"
      )}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20 shrink-0">
              <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="heading-1 truncate">AI Chats</h1>
              <p className="body-sm truncate">Conversations powered by your knowledge base</p>
            </div>
          </div>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="h-10 sm:h-11 text-sm sm:text-base w-full sm:w-auto active:scale-95 transition-transform shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* ── Search ─────────────────────────────────────────── */}
      <div className="relative group">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          type="text"
          placeholder="Search chats by title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10 h-10 sm:h-11 text-sm sm:text-base transition-shadow focus-visible:shadow-sm focus-visible:shadow-primary/10"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors active:scale-90"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Chat List ──────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/5" />
                    <Skeleton className="h-3 w-3/5" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredChats.length === 0 ? (
        <EmptyState
          icon={
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10">
                <Sparkles className="h-8 w-8 text-primary/60" />
              </div>
            </div>
          }
          title={searchQuery ? "No chats found" : "No chats yet"}
          description={
            searchQuery
              ? `No results for "${searchQuery}". Try a different search term.`
              : "Start a new conversation with your AI assistant. Your chats will appear here."
          }
          action={
            !searchQuery
              ? {
                  label: "Start a Chat",
                  onClick: () => setShowCreateDialog(true),
                }
              : undefined
          }
          className="py-16"
        />
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {filteredChats.map((chat, index) => (
            <Card
              key={chat.id}
              className={cn(
                "group cursor-pointer overflow-hidden",
                "border-border/60 hover:border-primary/30",
                "hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5",
                "active:scale-[0.99] translate-y-0",
                "transition-all duration-200 ease-out",
                mounted && "animate-fade-up"
              )}
              style={{ animationDelay: `${index * 40}ms`, animationFillMode: "both" }}
              onClick={() => router.push(`/chat/${chat.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/chat/${chat.id}`);
                }
              }}
            >
              <CardContent className="p-3.5 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  {/* Left: avatar + info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10 rounded-xl shrink-0 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10">
                      <AvatarFallback>
                        <Bot className="h-4 w-4 text-primary/60" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      {/* Title row */}
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-sm sm:text-base font-semibold truncate group-hover:text-primary transition-colors">
                          {chat.title || "Untitled Chat"}
                        </CardTitle>
                      </div>
                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {formatRelative(chat.updated_at || chat.created_at)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <StatusDot status={chat.status} />
                          <span
                            className={cn(
                              "text-xs font-medium capitalize",
                              chat.status === "active" && "text-emerald-500",
                              chat.status === "pending" && "text-amber-500",
                              chat.status === "processing" && "text-amber-500",
                              chat.status === "failed" && "text-red-500",
                              chat.status === "error" && "text-red-500",
                              chat.status === "canceled" && "text-red-500",
                              chat.status === "cancelled" && "text-red-500",
                              chat.status === "past_due" && "text-orange-500"
                            )}
                          >
                            {chat.status}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: status badge + delete */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cn(
                        "hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                        getStatusColor(chat.status)
                      )}
                    >
                      <StatusDot status={chat.status} />
                      {chat.status}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-9 w-9 rounded-lg",
                        "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
                        "opacity-100 sm:opacity-60 sm:hover:opacity-100 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 sm:focus:opacity-100",
                        "transition-all duration-200",
                        "active:scale-90"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(chat);
                      }}
                      title="Delete chat"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create Chat Dialog ─────────────────────────────── */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] sm:mx-auto animate-scale-in">
          <DialogHeader className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
              <Zap className="h-6 w-6 text-primary-foreground" />
            </div>
            <DialogTitle className="text-xl sm:text-2xl">
              Start a New Chat
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Give your conversation a descriptive title so you can find it
              later. You can always rename it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label
              htmlFor="chat-title"
              className="text-sm font-medium text-foreground"
            >
              Chat title
            </label>
            <Input
              id="chat-title"
              type="text"
              placeholder="e.g., Customer inquiry about billing"
              value={newChatTitle}
              onChange={(e) => setNewChatTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="h-11 text-sm sm:text-base"
            />
            <p className="text-xs text-muted-foreground">
              Press <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono">Enter</kbd> to create, <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono">Esc</kbd> to cancel
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setNewChatTitle("");
              }}
              className="w-full sm:w-auto h-10 sm:h-11 active:scale-95 transition-transform"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="w-full sm:w-auto h-10 sm:h-11 active:scale-95 transition-transform"
            >
              {createMutation.isPending ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Chat
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
