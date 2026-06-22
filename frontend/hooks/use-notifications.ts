"use client";

import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

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

export function useNotifications(
  workspaceId: string,
  customHandlers?: Record<string, NotificationHandler>,
) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const handlersRef = useRef({ ...defaultHandlers, ...customHandlers });
  handlersRef.current = { ...defaultHandlers, ...customHandlers };

  const connect = useCallback(() => {
    if (!workspaceId || eventSourceRef.current) return;

    const url = `/api/v1/workspaces/${workspaceId}/notifications/stream`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as NotificationEvent;
        if (data.type === "ping" || data.type === "connected") return;
        const handler = handlersRef.current[data.type];
        if (handler) handler(data);
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      setTimeout(connect, 5000);
    };
  }, [workspaceId]);

  const disconnect = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  }, []);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return { disconnect, reconnect: connect };
}
