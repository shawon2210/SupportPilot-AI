"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export function WorkspaceSwitcher() {
  const { currentWorkspace, setCurrentWorkspace, workspaces, setWorkspaces } = useWorkspaceStore();
  const [open, setOpen] = useState(false);

  type WorkspaceItem = { id: string; name: string; slug: string; plan: string; is_active: boolean; created_at: string | null };
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const res = await api.get<WorkspaceItem[]>("/workspaces");
      return res || [];
    },
  });

  useEffect(() => {
    if (data && data.length > 0 && !currentWorkspace) {
      setCurrentWorkspace(data[0]);
      setWorkspaces(data);
    } else if (data) {
      setWorkspaces(data);
    }
  }, [data, currentWorkspace, setCurrentWorkspace, setWorkspaces]);

  const handleSelect = (workspace: { id: string; name: string; slug: string; plan: string; is_active: boolean; created_at: string | null }) => {
    setCurrentWorkspace(workspace);
    setOpen(false);
    toast.success(`Switched to ${workspace.name}`);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between items-center"
          disabled={isLoading}
        >
          {isLoading ? (
            <Skeleton className="h-4 w-24" />
          ) : currentWorkspace ? (
            <span className="truncate text-sm">
              {currentWorkspace.name} <span className="text-muted-foreground">· {currentWorkspace.plan}</span>
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Select workspace</span>
          )}
          {!isLoading && <ChevronDown className="h-4 w-4 opacity-60" />}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isError ? (
          <div className="p-2">
            <p className="text-xs text-destructive mb-2">
              {error instanceof Error ? error.message : "Failed to load workspaces"}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {(workspaces.length > 0 ? workspaces : (data || [])).map((workspace) => {
              const item: WorkspaceItem = {
                id: workspace.id,
                name: workspace.name,
                slug: workspace.slug,
                plan: workspace.plan,
                is_active: workspace.is_active,
                created_at: workspace.created_at ?? null,
              };
              return (
                <DropdownMenuItem
                  key={item.id}
                  onSelect={() => handleSelect(item)}
                  className={currentWorkspace?.id === item.id ? "bg-accent" : ""}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-xs text-muted-foreground">{item.slug}</span>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => toast.info("Create workspace flow coming soon")}>
          <Plus className="h-4 w-4 mr-2" />
          New workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}