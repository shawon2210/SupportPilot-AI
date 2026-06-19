"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Upload, Globe, Search, FileText, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDate, formatBytes, getStatusColor } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function KnowledgePage() {
  const { currentWorkspace } = useWorkspaceStore();
  const wsId = currentWorkspace?.id || "placeholder";
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["documents", wsId, typeFilter, statusFilter],
    queryFn: async () => {
      try {
        const params: Record<string, string> = {};
        if (typeFilter !== "all") params.source_type = typeFilter;
        if (statusFilter !== "all") params.status = statusFilter;
        const res = await api.get<{ data: Array<{ id: string; name: string; source_type: string; status: string; file_size: number | null; mime_type: string | null; created_at: string | null }> }>(`/workspaces/${wsId}/documents`, params);
        return res.data || [];
      } catch (e) {
        toast.error("Failed to load documents");
        throw e;
      }
    },
  });

  if (isError) {
    return (
      <div className="px-4 sm:px-6">
        <ErrorState
          title="Failed to load documents"
          message={(error as Error)?.message || "An unexpected error occurred"}
          onRetry={refetch}
        />
      </div>
    );
  }

  const documents = data || [];
  const filtered = documents.filter((d) => !search || d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground">Manage your documents and knowledge sources</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Link href="/knowledge/websites">
            <Button variant="outline">
              <Globe className="h-4 w-4 mr-2" />
              Add Website
            </Button>
          </Link>
          <Link href="/knowledge/upload">
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full max-w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="docx">DOCX</SelectItem>
            <SelectItem value="txt">TXT</SelectItem>
            <SelectItem value="md">Markdown</SelectItem>
            <SelectItem value="website">Website</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-8 sm:py-12">
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="No documents yet"
            description="Upload your first document to build your knowledge base"
            action={{ label: "Upload Document", href: "/knowledge/upload" }}
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <a href={`/knowledge/${doc.id}`} className="text-sm font-medium hover:text-primary">
                        {doc.name}
                      </a>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground uppercase">
                      {doc.source_type}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(getStatusColor(doc.status))} variant="outline">
                        {doc.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatBytes(doc.file_size)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(doc.created_at)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          await api.delete(`/workspaces/${wsId}/documents/${doc.id}`);
                          refetch();
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
}
