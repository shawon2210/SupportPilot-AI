"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/stores";
import { api } from "@/lib/api";

export function AuthHydrator() {
  const token = useAuthStore((s) => s.token);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    if (!isLoading) {
      api.setToken(token);
      return;
    }
    // If persist hasn't hydrated yet, wait one tick then finalize loading
    const t = setTimeout(() => setLoading(false), 0);
    return () => clearTimeout(t);
  }, [token, isLoading, setLoading]);

  return null;
}
