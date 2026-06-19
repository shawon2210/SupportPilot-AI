"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Download } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores";
import { formatDateTime } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";

export default function AuditPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const wsId = currentWorkspace?.id || "placeholder";
  const [actionFilter, setActionFilter] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["audit-logs", wsId, actionFilter],
    queryFn: async () => {
      try {
        const params: Record<string, string> = { per_page: "50" };
        if (actionFilter) params.action = actionFilter;
        const res = await api.get<{ data: Array<{ id: string; action: string; resource_type: string; resource_id: string | null; user_id: string | null; details: string | null; ip_address: string | null; created_at: string | null }> }>(`/workspaces/${wsId}/analytics/audit`, params);
        return res.data || [];
      } catch (err) {
        toast.error("Failed to load audit logs");
        throw err;
      }
    },
  });

  const logs = (data || []).filter((l) => !search || l.action.toLowerCase().includes(search.toLowerCase()) || l.resource_type.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground">Workspace activity history</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search logs..." className="pl-10" />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-full sm:w-auto">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Actions</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
            <SelectItem value="invite">Invite</SelectItem>
            <SelectItem value="feature">Feature Flag</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : isError ? (
        <ErrorState
          title="Failed to load audit logs"
          message={error?.message || "An error occurred while loading audit logs."}
          onRetry={refetch}
        />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<Filter className="h-12 w-12" />}
          title="No audit logs found"
          description="No activity logs match your current filters."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead className="hidden sm:table-cell">User</TableHead>
                <TableHead className="hidden sm:table-cell">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.action}</TableCell>
                  <TableCell className="text-muted-foreground">{log.resource_type}{log.resource_id ? `: ${log.resource_id.slice(0, 8)}` : ""}</TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">{log.user_id?.slice(0, 8) || "system"}</TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">{formatDateTime(log.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
