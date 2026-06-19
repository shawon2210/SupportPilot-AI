"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

interface ThemeProviderProps {
  children: ReactNode;
  attribute?: string;
  defaultTheme?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  forcedTheme?: string;
  nonce?: string;
  themes?: string[];
  storageKey?: string;
  value?: Record<string, string>;
  onChange?: (theme: string) => void;
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...(props as Parameters<typeof NextThemesProvider>[0])}>{children}</NextThemesProvider>;
}
