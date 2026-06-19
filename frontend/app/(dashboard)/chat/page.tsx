"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { MessageSquare, Plus, Search, Trash2, Clock, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores";
import { cn, formatRelative, truncate, getStatusColor } from "@/lib/utils";
import type { Chat, PaginatedResponse } from "@/lib/schemas";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

export default function ChatListPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspaceStore();
  const workspaceId = currentWorkspace?.id || "";

  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery<PaginatedResponse<Chat>>({
    queryKey: ["chats", workspaceId],
    queryFn: async () => {
      try {
        return api.get<PaginatedResponse<Chat>>(`/workspaces/${workspaceId}/chats`);
      } catch (e) {
        toast.error("Failed to load chats");
        throw e;
      }
    },
    enabled: !!workspaceId,
  });

  const createMutation = useMutation({
    mutationFn: (title: string) => api.post<Chat>(`/workspaces/${workspaceId}/chats`, { title }),
    onSuccess: () => { toast.success("Chat created"); queryClient.invalidateQueries({ queryKey: ["chats", workspaceId] }); },
    onError: () => toast.error("Failed to create chat"),
  });

  const deleteMutation = useMutation({
    mutationFn: (chatId: string) => api.delete(`/workspaces/${workspaceId}/chats/${chatId}`),
    onSuccess: () => { toast.success("Chat deleted"); queryClient.invalidateQueries({ queryKey: ["chats", workspaceId] }); },
    onError: () => toast.error("Failed to delete chat"),
  });

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

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
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
    ? chats.filter((c) => c.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    : chats;

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 p-2 sm:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            AI Chats
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Conversations powered by your knowledge base
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="h-9 sm:h-10 text-sm sm:text-base w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search chats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-9 sm:h-10 text-sm sm:text-base"
        />
      </div>

      {/* Chat List */}
      {isLoading ? (
        <div className="space-y-2 sm:space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardHeader className="p-3 sm:p-6">
                <Skeleton className="h-4 w-1/3 mb-2" />
                <Skeleton className="h-3 w-2/3" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : filteredChats.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-10 w-10 sm:h-12 sm:w-12" />}
          title={searchQuery ? "No chats found" : "No chats yet"}
          description={
            searchQuery
              ? "Try a different search term"
              : "Start a new conversation with your AI assistant"
          }
          action={
            !searchQuery
              ? {
                  label: "Start a Chat",
                  onClick: () => setShowCreateDialog(true),
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {filteredChats.map((chat) => (
            <Card
              key={chat.id}
              className="group hover:border-primary/30 transition-all cursor-pointer"
              onClick={() => router.push(`/chat/${chat.id}`)}
            >
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                    <Avatar className="h-8 w-8 sm:h-9 sm:w-9 shrink-0">
                      <AvatarFallback>
                        <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                        <CardTitle className="text-sm sm:text-base truncate">
                          {chat.title || "Untitled Chat"}
                        </CardTitle>
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 w-fit",
                            getStatusColor(chat.status)
                          )}
                        >
                          {chat.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatRelative(chat.updated_at || chat.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 shrink-0 h-8 w-8 sm:h-9 sm:w-9"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this chat?")) {
                        deleteMutation.mutate(chat.id);
                      }
                    }}
                    title="Delete chat"
                  >
                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Chat Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-sm sm:max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">New Chat</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Give your conversation a title to get started.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="text"
            placeholder="e.g., Customer inquiry about billing"
            value={newChatTitle}
            onChange={(e) => setNewChatTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="h-9 sm:h-10 text-sm sm:text-base"
          />
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setNewChatTitle("");
              }}
              className="w-full sm:w-auto h-9 sm:h-10 text-sm sm:text-base"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="w-full sm:w-auto h-9 sm:h-10 text-sm sm:text-base"
            >
              {createMutation.isPending ? "Creating..." : "Create Chat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
