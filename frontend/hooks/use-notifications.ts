"use client";

import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

type NotificationEvent = {
  type: string;
  [key: string]: unknown;
};

type NotificationHandler = (event: NotificationEvent) => void;

const defaultHandlers: Record<string, NotificationHandler> = {
  "document.ready": (e) => {
    toast.success(`Document ready: ${e.name || "Unknown"}`);
  },
  "knowledge.gap": (e) => {
    const query = typeof e.query === "string" ? e.query : "";
    toast.info(`Knowledge gap detected: "${query.slice(0, 80)}..."`);
  },
};

function parseSSELine(line: string): { eventType?: string; data?: string } | null {
  if (line.startsWith("event: ")) return { eventType: line.slice(7) };
  if (line.startsWith("data: ")) return { data: line.slice(6) };
  return null;
}

export function useNotifications(
  workspaceId: string,
  customHandlers?: Record<string, NotificationHandler>,
) {
  const abortRef = useRef<AbortController | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlersRef = useRef({ ...defaultHandlers, ...customHandlers });
  handlersRef.current = { ...defaultHandlers, ...customHandlers };

  const connect = useCallback(() => {
    if (!workspaceId) return;

    const controller = new AbortController();
    abortRef.current = controller;

    const token = api.getToken();
    const baseUrl = api.getBaseUrl();
    const url = `${baseUrl}/workspaces/${workspaceId}/notifications/stream`;

    (async () => {
      try {
        const res = await fetch(url, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            Accept: "text/event-stream",
          },
          signal: controller.signal,
        });

        if (!res.ok) {
          if (res.status === 401) {
            // 401 is expected when the user is not authenticated; don't spam reconnect
            return;
          }
          setTimeout(connect, 5000);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line === "") continue;
            const parsed = parseSSELine(line);
            if (!parsed) continue;
            if (parsed.eventType) continue;
            if (parsed.data && parsed.data.trim()) {
              try {
                const data = JSON.parse(parsed.data) as NotificationEvent;
                if (data.type === "ping" || data.type === "connected") continue;
                const handler = handlersRef.current[data.type];
                if (handler) handler(data);
              } catch {
                // ignore parse errors
              }
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
      }

      // Reconnect on connection close (unless aborted)
      if (!controller.signal.aborted) {
        reconnectTimerRef.current = setTimeout(connect, 5000);
      }
    })();
  }, [workspaceId]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return { disconnect, reconnect: connect };
}
