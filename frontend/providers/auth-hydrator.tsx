"use client";
import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores";
import { api } from "@/lib/api";

export function AuthHydrator() {
  const token = useAuthStore((s) => s.token);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setLoading = useAuthStore((s) => s.setLoading);
  const initialized = useRef(false);

  // Set token on the API client immediately on mount (synchronous)
  if (!initialized.current) {
    api.setToken(token);
    initialized.current = true;
  }

  useEffect(() => {
    if (!isLoading) {
      // Ensure token is set whenever it changes (e.g. after sign-in/sign-out)
      api.setToken(token);
      return;
    }
    // If persist hasn't hydrated yet, wait one tick then finalize loading
    const t = setTimeout(() => {
      setLoading(false);
      api.setToken(token);
    }, 0);
    return () => clearTimeout(t);
  }, [token, isLoading, setLoading]);

  return null;
}
