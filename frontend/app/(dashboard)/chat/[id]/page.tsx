"use client";



import { useState, useRef, useEffect, useCallback } from "react";

import { useParams, useRouter } from "next/navigation";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ArrowLeft, Send, Trash2, Copy, Check, Bot, User, FileText, ChevronDown, ChevronUp, MessageSquare, Zap } from "lucide-react";

import { api } from "@/lib/api";

import { useWorkspaceStore } from "@/stores";

import { cn, formatDateTime } from "@/lib/utils";

import type { ChatWithMessages, Message } from "@/lib/schemas";



import { Button } from "@/components/ui/button";

import { Textarea } from "@/components/ui/textarea";

import { Skeleton } from "@/components/ui/skeleton";

import { EmptyState } from "@/components/ui/empty-state";

import { ErrorState } from "@/components/ui/error-state";

import { Badge } from "@/components/ui/badge";

import { toast } from "sonner";



// ── Simple Markdown Renderer ──────────────────────────────────────



function renderMarkdown(text: string): string {

  if (!text) return "";

  const html = text

    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-muted/60 rounded-md p-3 my-2 overflow-x-auto text-sm font-mono border border-border/50"><code>$2</code></pre>')

    .replace(/`([^`]+)`/g, '<code class="bg-muted/60 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')

    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

    .replace(/\*(.+?)\*/g, '<em>$1</em>')

    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-3 mb-1">$1</h3>')

    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-3 mb-1">$1</h2>')

    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-3 mb-1">$1</h1>')

    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')

    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')

    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline hover:text-primary/80" target="_blank" rel="noopener">$1</a>')

    .replace(/\n\n/g, '<br/><br/>')

    .replace(/\n/g, "<br/>");

  return html;

}



// ── Source Citation Component ──────────────────────────────────────



interface SourceItem {
  title?: string;
  name?: string;
  content?: string;
  url?: string;
  score?: number;
}

function SourceCitations({ sources }: { sources: SourceItem[] }) {

  const [expanded, setExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (

    <div className="mt-3 pt-3 border-t border-border/50">

      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">

        <FileText className="h-3 w-3" />

        <span>{sources.length} source{sources.length !== 1 ? "s" : ""} referenced</span>

        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}

      </button>

      {expanded && (

        <div className="mt-2 space-y-2">

          {sources.map((source: SourceItem, idx: number) => (

            <div key={idx} className="text-xs rounded-md border border-border/50 bg-muted/30 p-2.5">

              <div className="flex items-center justify-between mb-1">

                <span className="font-medium truncate">{source.title || source.name || `Source ${idx + 1}`}</span>

                {source.score != null && (

                  <Badge variant="secondary" className="ml-2 shrink-0 font-mono text-xs">{(source.score * 100).toFixed(0)}%</Badge>

                )}

              </div>

              {source.content && <p className="text-muted-foreground line-clamp-2">{source.content}</p>}

              {source.url && <a href={source.url} target="_blank" rel="noopener" className="text-primary hover:underline mt-1 inline-block">View source</a>}

            </div>

          ))}

        </div>

      )}

    </div>

  );

}



// ── Token Usage Badge ──────────────────────────────────────────────



function TokenUsage({ tokens }: { tokens?: number | null }) {

  if (!tokens) return null;

  return (

    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground ml-2">

      <Zap className="h-3 w-3" />{tokens.toLocaleString()} tokens

    </span>

  );

}



// ── Message Bubble ─────────────────────────────────────────────────



function MessageBubble({ message, isLast }: { message: Message; isLast?: boolean }) {

  const [copied, setCopied] = useState(false);

  const isAssistant = message.role === "assistant";



  const handleCopy = async () => {

    await navigator.clipboard.writeText(message.content);

    setCopied(true);

    setTimeout(() => setCopied(false), 2000);

  };



  return (

    <div className={cn("flex gap-3 py-4 px-2 sm:px-4 rounded-lg", isAssistant ? "bg-muted/30" : "bg-transparent")}>

      <div className={cn("shrink-0 h-8 w-8 rounded-full flex items-center justify-center", isAssistant ? "bg-primary/10 text-primary" : "bg-accent text-accent-foreground")}>

        {isAssistant ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}

      </div>

      <div className="flex-1 min-w-0">

        <div className="flex items-center gap-2 mb-1">

          <span className="text-sm font-medium">{isAssistant ? "Assistant" : "You"}</span>

          <span className="text-xs text-muted-foreground">{formatDateTime(message.created_at)}</span>

          {isAssistant && <TokenUsage tokens={message.tokens_used} />}

        </div>

        <div className="text-sm leading-relaxed prose-sm max-w-none prose-p:my-1 prose-pre:my-2" dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />

        {isAssistant && isLast && message.content === "" && (

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1" aria-label="AI is thinking">

            <span>Thinking</span>

            <div className="flex gap-1 items-center h-3">

              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />

              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />

              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />

            </div>

          </div>

        )}

        {isAssistant && <SourceCitations sources={message.sources ?? []} />}

        {isAssistant && message.content && (

          <button onClick={handleCopy} className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors" title="Copy to clipboard">

            {copied ? <><Check className="h-3 w-3 text-green-500" /><span className="text-green-500">Copied!</span></> : <><Copy className="h-3 w-3" />Copy</>}

          </button>

        )}

      </div>

    </div>

  );

}



// ── Main Chat Page ─────────────────────────────────────────────────



export default function ChatDetailPage() {

  const params = useParams();

  const router = useRouter();

  const queryClient = useQueryClient();

  const { currentWorkspace } = useWorkspaceStore();

  const workspaceId = currentWorkspace?.id || "";

  const chatId = params.id as string;



  const [input, setInput] = useState("");

  const [streamingContent, setStreamingContent] = useState("");

  const [isStreaming, setIsStreaming] = useState(false);

  const [showGapSuggestion, setShowGapSuggestion] = useState<{query: string; id: string} | null>(null);

  const [showTemplates, setShowTemplates] = useState(false);

  const { data: templates } = useQuery({
    queryKey: ["canned-responses", workspaceId],
    queryFn: () => api.get<Array<{id: string; title: string; content: string; shortcut?: string; category?: string}>>(`/workspaces/${workspaceId}/canned-responses`),
    enabled: !!workspaceId,
    staleTime: 30000,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const abortControllerRef = useRef<AbortController | null>(null);



  const { data, isLoading, error, refetch } = useQuery<ChatWithMessages>({

    queryKey: ["chat", workspaceId, chatId],

    queryFn: () => api.get<ChatWithMessages>(`/workspaces/${workspaceId}/chats/${chatId}`),

    enabled: !!workspaceId && !!chatId,

    refetchInterval: isStreaming ? false : 10000,

  });



  useMutation({

    mutationFn: () => api.delete(`/workspaces/${workspaceId}/chats/${chatId}`),

    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["chats", workspaceId] }); router.push("/chat"); },

  });



  const scrollToBottom = useCallback(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, []);



  useEffect(() => { scrollToBottom(); }, [data?.messages, streamingContent, scrollToBottom]);



  useEffect(() => {

    if (textareaRef.current) { textareaRef.current.style.height = "auto"; textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px"; }

  }, [input]);



  const handleSend = async () => {

    const content = input.trim();

    if (!content || isStreaming) return;

    if (!workspaceId || !chatId) { toast.error("Workspace or chat not loaded"); setIsStreaming(false); return; }

    setInput(""); setStreamingContent(""); setIsStreaming(true); setShowGapSuggestion(null);

    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const controller = new AbortController();

    abortControllerRef.current = controller;

    try {

      const response = await api.postStream(`/workspaces/${workspaceId}/chats/${chatId}/messages/stream`, { content }, controller.signal);

      if (!response.ok) throw new Error(`Request failed: ${response.status}`);

      const reader = response.body?.getReader();

      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();

      let buffer = "";

      while (true) {

        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");

        buffer = lines.pop() || "";

        for (const line of lines) {

          const trimmed = line.trim();

          if (trimmed.startsWith("data: ")) {

            const data = trimmed.slice(6);

            try {

              const parsed = JSON.parse(data);

              if (parsed.done) {
                setIsStreaming(false); setStreamingContent("");
                if (parsed.gap) setShowGapSuggestion(parsed.gap);
                queryClient.invalidateQueries({ queryKey: ["chat", workspaceId, chatId] });
                return;
              }

              if (parsed.error) { setIsStreaming(false); setStreamingContent(""); toast.error(parsed.error); queryClient.invalidateQueries({ queryKey: ["chat", workspaceId, chatId] }); return; }

              const token = parsed.delta?.content || parsed.content || parsed.token || ""; if (token) setStreamingContent((prev) => prev + token);

            } catch { if (data) setStreamingContent((prev) => prev + data); }

          } else if (trimmed && !trimmed.startsWith(":")) {

            try { const parsed = JSON.parse(trimmed); const token = parsed.delta?.content || parsed.content || parsed.token || ""; if (token) setStreamingContent((prev) => prev + token); } catch { /* ignore */ }

          }

        }

      }

      setIsStreaming(false); setStreamingContent("");

      queryClient.invalidateQueries({ queryKey: ["chat", workspaceId, chatId] });

    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Streaming error:", err.message, `/workspaces/${workspaceId}/chats/${chatId}/messages/stream`);

        toast.error(`Failed to send message: ${err.message}`);

        setStreamingContent("\n\n⚠️ Sorry, an error occurred while generating the response. Please try again.");

      }

      setIsStreaming(false);

    }

  };



  const handleStopGeneration = () => { abortControllerRef.current?.abort(); setIsStreaming(false); queryClient.invalidateQueries({ queryKey: ["chat", workspaceId, chatId] }); };



  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } };



  const messages = data?.messages || [];



  if (error) {

    return (

      <div className="flex items-center justify-center h-64 p-4">

        <ErrorState

          title="Failed to load chat"

          message={(error as Error)?.message || "An unexpected error occurred"}

          onRetry={() => refetch()}

        />

      </div>

    );

  }



  if (isLoading) {

    return (

      <div className="flex flex-col h-full p-4 space-y-4">

        <Skeleton className="h-16 w-full" />

        <Skeleton className="h-32 w-full" />

        <Skeleton className="h-32 w-full" />

        <Skeleton className="h-32 w-full" />

      </div>

    );

  }



  return (

    <div className="flex flex-col h-full">

      <div className="flex items-center gap-3 px-2 sm:px-4 py-3 border-b border-border">

        <Button

          variant="ghost"

          size="icon"

          onClick={() => router.push("/chat")}

          className="shrink-0 text-muted-foreground hover:text-foreground active:scale-95"

          aria-label="Back to chats"

        >

          <ArrowLeft className="h-4 w-4" />

        </Button>

        <div className="flex-1 min-w-0">

          <h2 className="font-medium text-sm truncate">{data?.title || "Chat"}</h2>

          <p className="text-xs text-muted-foreground">{messages.length} messages</p>

        </div>

        <Button

          variant="ghost"

          size="icon"

          onClick={async () => {

            await api.delete(`/workspaces/${workspaceId}/chats/${chatId}`);

            router.push("/chat");

          }}

          className="shrink-0 text-muted-foreground hover:text-destructive active:scale-95"

          aria-label="Delete chat"

        >

          <Trash2 className="h-4 w-4" />

        </Button>

      </div>



      <div className="flex-1 overflow-y-auto px-2 sm:px-4 space-y-4">

        {messages.length === 0 && !isStreaming ? (

          <EmptyState

            icon={<MessageSquare className="h-12 w-12" />}

            title="No messages yet"

            description="Start a conversation with your AI assistant"

          />

        ) : (

          <>

            {messages.map((msg, idx) => (

              <MessageBubble

                key={msg.id}

                message={msg}

                isLast={idx === messages.length - 1 && !isStreaming}

              />

            ))}

            {isStreaming && streamingContent && (

              <MessageBubble

                message={{

                  id: "streaming",

                  chat_id: chatId,

                  workspace_id: workspaceId,

                  role: "assistant",

                  content: streamingContent,

                  created_at: new Date().toISOString()

                }}

                isLast

              />

            )}

            {isStreaming && !streamingContent && (

              <MessageBubble

                message={{

                  id: "thinking",

                  chat_id: chatId,

                  workspace_id: workspaceId,

                  role: "assistant",

                  content: "",

                  created_at: new Date().toISOString()

                }}

                isLast

              />

            )}

          </>

        )}

        <div ref={messagesEndRef} />

      </div>



      {showGapSuggestion && (
        <div className="mx-2 sm:mx-4 mb-2 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 text-sm">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <p className="font-medium text-amber-800 dark:text-amber-300">Knowledge gap detected</p>
            <p className="mt-0.5 text-amber-700 dark:text-amber-400">
              I couldn't find enough information in the knowledge base to answer this question thoroughly.
            </p>
            <Button
              variant="link"
              className="mt-1 h-auto p-0 text-amber-700 dark:text-amber-400 underline hover:text-amber-900"
              onClick={() => {
                router.push(`/knowledge/upload?from=chat&query=${encodeURIComponent(showGapSuggestion.query)}`);
                setShowGapSuggestion(null);
              }}
            >
              Add a document about this topic
            </Button>
          </div>
          <button onClick={() => setShowGapSuggestion(null)} className="shrink-0 text-amber-400 hover:text-amber-600" aria-label="Dismiss">
            <span className="text-lg leading-none">&times;</span>
          </button>
        </div>
      )}



      <div className="border-t border-border p-2 sm:p-4 sticky bottom-0 bg-background z-sticky">

        {showTemplates && templates && templates.length > 0 && (
          <div className="mb-3 max-h-48 overflow-y-auto rounded-lg border border-border bg-background p-2 shadow-lg">
            <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Templates</p>
            {templates.map((t) => (
              <button
                key={t.id}
                className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/60 transition-colors"
                onClick={() => { setInput(t.content); setShowTemplates(false); }}
              >
                <span className="font-medium">{t.title}</span>
                {t.shortcut && <span className="ml-2 text-xs text-muted-foreground">/{t.shortcut}</span>}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">

          <Textarea

            ref={textareaRef}

            value={input}

            onChange={(e) => setInput(e.target.value)}

            onKeyDown={handleKeyDown}

            placeholder="Type your message..."

            rows={1}

            className="w-full flex-1 text-base sm:text-sm resize-none max-h-[120px]"

          />

          {isStreaming ? (

            <Button

              onClick={handleStopGeneration}

              variant="outline"

              className="w-full sm:w-auto h-10 border-destructive text-destructive hover:bg-destructive/10"

            >

              Stop

            </Button>

          ) : (

            <div className="flex gap-2">

              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowTemplates(!showTemplates)}
                disabled={!templates?.length}
                className="h-10 w-10 shrink-0"
                title="Templates"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>

              <Button

                onClick={handleSend}

                disabled={!input.trim()}

                className="h-10"

              >

                <Send className="h-4 w-4 sm:mr-2" />

                <span className="sm:inline hidden">Send</span>

              </Button>

            </div>

          )}

        </div>

      </div>

    </div>

  );

}

