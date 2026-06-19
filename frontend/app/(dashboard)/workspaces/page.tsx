"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, Settings, Users, FileText, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores";
import { formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

interface WorkspaceListItem {
  id: string;
  name: string;
  slug: string;
  plan: string;
  is_active: boolean;
  created_at: string | null;
  member_count?: number;
  document_count?: number;
}

export default function WorkspacesPage() {
  const { workspaces, setWorkspaces, setCurrentWorkspace } = useWorkspaceStore();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      try {
        const res = await api.get<{ data: WorkspaceListItem[] }>("/workspaces");
        const items = res.data || [];
        setWorkspaces(items as Parameters<typeof setWorkspaces>[0]);
        return items;
      } catch (err) {
        toast.error("Failed to load workspaces");
        throw err;
      }
    },
  });

  const list: WorkspaceListItem[] = data ?? workspaces as WorkspaceListItem[];

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-40 mb-2" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <ErrorState
          title="Failed to load workspaces"
          message="Could not load your workspaces. Please try again."
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Workspaces</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your workspaces</p>
        </div>
        <Link href="/workspaces/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />Create Workspace
          </Button>
        </Link>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid className="h-12 w-12" />}
          title="No workspaces yet"
          description="Create your first workspace to get started with SupportPilot."
          action={{ label: "Create Workspace", href: "/workspaces/create" }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map((ws) => (
            <Link key={ws.id} href={`/workspaces/${ws.id}`}
              onClick={() => setCurrentWorkspace({ id: ws.id, name: ws.name, slug: ws.slug, plan: ws.plan, is_active: ws.is_active, created_at: ws.created_at })}>
              <Card className="hover:bg-accent transition-colors group h-full">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {ws.name[0]?.toUpperCase()}
                    </div>
                    <Settings className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="font-medium mb-1">{ws.name}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-xs text-muted-foreground">{ws.slug}</p>
                    <Badge variant="secondary" className="capitalize">{ws.plan}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{ws.member_count || 0}</span>
                    <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{ws.document_count || 0}</span>
                    <span>{formatDate(ws.created_at)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
