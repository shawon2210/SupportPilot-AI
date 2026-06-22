"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          retry: (failureCount, error) => {
            // Never retry auth errors (401 Unauthorized)
            if (error && typeof error === "object" && "status" in error && (error as { status: number }).status === 401) {
              return false;
            }
            // Never retry 403 Forbidden or 404 Not Found
            if (error && typeof error === "object" && "status" in error) {
              const status = (error as { status: number }).status;
              if (status === 403 || status === 404) return false;
            }
            return failureCount < 1;
          },
          refetchOnWindowFocus: false,
        },
      },
    })
  );
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}