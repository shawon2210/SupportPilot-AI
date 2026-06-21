"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { FileText, Trash2, Loader2, AlertCircle, Eye, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores";
import { cn, formatDate, formatBytes, getStatusColor } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

export default function DocumentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { currentWorkspace } = useWorkspaceStore();
  const wsId = currentWorkspace?.id || "placeholder";
  const docId = params.id as string;
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: doc, isLoading: docLoading, isError: docError, error: docErrorObj } = useQuery({
    queryKey: ["document", wsId, docId],
    queryFn: async () => {
      try {
        const res = await api.get<{ id: string; name: string; source_type: string; status: string; file_size: number | null; mime_type: string | null; error_message: string | null; created_at: string | null; updated_at: string | null }>(`/workspaces/${wsId}/documents/${docId}`);
        return res;
      } catch (err) {
        toast.error("Failed to load document");
        throw err;
      }
    },
  });

  const { data: chunks, isLoading: chunksLoading, isError: chunksError } = useQuery({
    queryKey: ["document-chunks", wsId, docId],
    queryFn: async () => {
      try {
        const res = await api.get<{ data: Array<{ id: string; chunk_index: number; content: string; token_count: number | null }> }>(`/workspaces/${wsId}/documents/${docId}/chunks`);
        return res.data || [];
      } catch (err) {
        toast.error("Failed to load document chunks");
        throw err;
      }
    },
    enabled: doc?.status === "ready",
  });

  const handleDelete = async () => {
    try {
      await api.delete(`/workspaces/${wsId}/documents/${docId}`);
      toast.success("Document deleted");
      window.history.back();
    } catch (err) {
      toast.error("Failed to delete document");
    }
  };

  if (docLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      </div>
    );
  }

  if (docError) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <ErrorState
          title="Failed to load document"
          message={docErrorObj?.message || "An error occurred while loading this document."}
        />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <EmptyState
          icon={<AlertCircle className="h-12 w-12" />}
          title="Document not found"
          description="The requested document could not be found."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/knowledge")}
        className="flex items-center gap-2 -ml-2 text-muted-foreground hover:text-foreground active:scale-[0.97]"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Knowledge Base</span>
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="heading-1 font-bold">{doc.name}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
            <span className="uppercase">{doc.source_type}</span>
            <span>•</span>
            <span>{formatBytes(doc.file_size)}</span>
            <span>•</span>
            <span>{formatDate(doc.created_at)}</span>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDelete} className="self-start active:scale-[0.97]">
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <span className={cn("text-xs px-2 py-0.5 rounded-full border", getStatusColor(doc.status))}>{doc.status}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Type</p>
            <p className="text-sm font-medium uppercase">{doc.source_type}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Size</p>
            <p className="text-sm font-medium">{formatBytes(doc.file_size)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Chunks</p>
            <p className="text-sm font-medium">{chunksLoading ? "—" : chunks?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {doc.error_message && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-sm text-destructive font-medium">Error: {doc.error_message}</p>
          </CardContent>
        </Card>
      )}

      {chunks && chunks.length > 0 && (
        <div>
          <h2 className="heading-2 mb-3">Document Chunks ({chunks.length})</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {chunks.map((chunk) => (
              <Card key={chunk.id}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">Chunk #{chunk.chunk_index}</Badge>
                    {chunk.token_count && <span className="text-xs text-muted-foreground">{chunk.token_count} tokens</span>}
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">{chunk.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {chunksLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {chunksError && (
        <ErrorState
          title="Failed to load chunks"
          message="An error occurred while loading document chunks."
        />
      )}

      {doc?.status === "ready" && !chunksLoading && chunks?.length === 0 && (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="No chunks found"
          description="This document has been processed but no chunks were generated."
        />
      )}
    </div>
  );
}
