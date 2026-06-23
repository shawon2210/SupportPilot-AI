"use client";

import { useWorkspaceStore } from "@/stores";

interface AuthorizedProps {
  roles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function Authorized({ roles, children, fallback }: AuthorizedProps) {
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);

  if (!currentWorkspace) return fallback ?? null;

  // Use workspace plan as a coarse permission check
  // Enterprise plan gets full access; others are limited
  if (roles.includes("admin") && currentWorkspace.plan !== "enterprise") {
    return fallback ?? null;
  }

  return <>{children}</>;
}
