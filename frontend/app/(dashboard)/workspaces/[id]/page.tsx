"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Settings, Trash2, Loader2, Users, FileText, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores";
import { formatDate, formatNumber } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";

interface WorkspaceDetail {
  id: string;
  name: string;
  slug: string;
  plan: string;
  is_active: boolean;
  created_at: string | null;
  member_count?: number;
  document_count?: number;
}

export default function WorkspaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentWorkspace, removeWorkspace } = useWorkspaceStore();
  const wsId = params.id as string;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["workspace", wsId],
    queryFn: async () => {
      try {
        const res = await api.get<WorkspaceDetail>(`/workspaces/${wsId}`);
        return res;
      } catch (err) {
        toast.error("Failed to load workspace details");
        throw err;
      }
    },
  });

  const ws: WorkspaceDetail | undefined = data ?? currentWorkspace as WorkspaceDetail;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <ErrorState
          title="Failed to load workspace"
          message="Could not load the workspace details. Please try again."
          onRetry={refetch}
        />
      </div>
    );
  }

  if (!ws) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <ErrorState
          title="Workspace not found"
          message="The workspace you are looking for does not exist or has been removed."
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{ws.name}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">{ws.slug} • Created {formatDate(ws.created_at)}</p>
        </div>
        <Button variant="destructive" size="sm" onClick={async () => {
          try {
            await api.delete(`/workspaces/${wsId}`);
            removeWorkspace(wsId);
            toast.success("Workspace deleted");
            router.push("/workspaces");
          } catch {
            toast.error("Failed to delete workspace");
          }
        }} className="gap-1.5">
          <Trash2 className="h-3.5 w-3.5" />Delete
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><Users className="h-4 w-4 text-blue-500" /><span className="text-xs text-muted-foreground">Members</span></div>
            <p className="text-2xl font-bold">{formatNumber(ws.member_count)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><FileText className="h-4 w-4 text-purple-500" /><span className="text-xs text-muted-foreground">Documents</span></div>
            <p className="text-2xl font-bold">{formatNumber(ws.document_count)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><Settings className="h-4 w-4 text-green-500" /><span className="text-xs text-muted-foreground">Plan</span></div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold capitalize">{ws.plan}</p>
              <Badge variant="secondary" className="capitalize">{ws.plan}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
          <CardTitle className="text-sm">Workspace Settings</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Name</label>
            <Input defaultValue={ws.name} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Slug</label>
            <Input defaultValue={ws.slug} />
          </div>
          <Button className="mt-2">Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}
