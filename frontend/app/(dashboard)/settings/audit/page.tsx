"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, FileText, User } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

  const logs = (data || []).filter((l) =>
    !search ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.resource_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Workspace activity history</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search logs..." className="pl-10 h-9 sm:h-10" />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-full sm:w-[160px] h-9 sm:h-10">
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
          icon={<Filter className="h-10 w-10 sm:h-12 sm:w-12" />}
          title="No audit logs found"
          description="No activity logs match your current filters."
        />
      ) : (
        <>
          {/* Mobile: Card layout */}
          <div className="sm:hidden space-y-2">
            {logs.map((log) => (
              <Card key={log.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] capitalize">{log.action}</Badge>
                        <span className="text-[10px] text-muted-foreground">{log.resource_type}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{log.user_id?.slice(0, 8) || "system"}</span>
                        <span>•</span>
                        <span>{formatDateTime(log.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: Table layout */}
          <div className="hidden sm:block overflow-x-auto">
            <Card>
              <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{log.action}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.resource_type}
                        {log.resource_id ? `: ${log.resource_id.slice(0, 8)}` : ""}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.user_id?.slice(0, 8) || "system"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(log.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
