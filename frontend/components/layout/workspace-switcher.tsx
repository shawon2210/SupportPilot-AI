"use client";
import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Plus, Check } from "lucide-react";
import { useWorkspaceStore } from "@/stores";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher() {
  const { currentWorkspace, workspaces, setCurrentWorkspace } = useWorkspaceStore();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-accent text-left">
        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
          {currentWorkspace?.name?.[0]?.toUpperCase() || "W"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{currentWorkspace?.name || "Select workspace"}</p>
          <p className="text-xs text-muted-foreground capitalize">{currentWorkspace?.plan || "free"}</p>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 rounded-md border border-border bg-card shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
            {workspaces.map((ws) => (
              <button key={ws.id} onClick={() => { setCurrentWorkspace(ws); setOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-accent">
                <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {ws.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ws.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{ws.plan}</p>
                </div>
                {currentWorkspace?.id === ws.id && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
            <div className="border-t border-border mt-1 pt-1">
            <Link href="/workspaces/create" className="flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-accent">
              <Plus className="h-4 w-4" />Create workspace
            </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
