"use client";
import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Upload, FileText, X, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

interface UploadFile {
  file: File;
  name: string;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
}

export default function UploadPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const wsId = currentWorkspace?.id || "placeholder";
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const uploadMutation = useMutation({
    mutationFn: async (file: UploadFile) => {
      const formData = new FormData();
      formData.append("file", file.file);
      formData.append("name", file.name);
      const res = await fetch(`/api/v1/workspaces/${wsId}/documents`, { method: "POST", body: formData, headers: {} });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: (_, vars) => {
      setFiles((prev) => prev.map((f) => f.file === vars.file ? { ...f, status: "done" as const, progress: 100 } : f));
    },
    onError: (_, vars) => {
      setFiles((prev) => prev.map((f) => f.file === vars.file ? { ...f, status: "error" as const, error: "Upload failed" } : f));
      toast.error("Upload failed");
    },
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "text/markdown"].includes(f.type) || f.name.endsWith(".md")
    );
    setFiles((prev) => [...prev, ...dropped.map((file) => ({ file, name: file.name, status: "pending" as const, progress: 0 }))]);
  }, []);

  const handleUpload = () => {
    files.filter((f) => f.status === "pending").forEach((f) => {
      setFiles((prev) => prev.map((p) => p.file === f.file ? { ...p, status: "uploading" as const } : p));
      uploadMutation.mutate(f);
    });
  };

  const removeFile = (file: File) => setFiles((prev) => prev.filter((f) => f.file !== file));

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 px-4 sm:px-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <Skeleton className="h-5 w-5" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2 w-1/4" />
              </div>
              <Skeleton className="h-6 w-6" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <Skeleton className="h-5 w-5" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-2 w-1/3" />
              </div>
              <Skeleton className="h-6 w-6" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-4 sm:px-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Upload Documents</h1>
        <p className="text-muted-foreground">Upload PDF, DOCX, TXT, or Markdown files to your knowledge base</p>
      </div>

      <div onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
        className={cn("border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors", dragOver ? "border-primary bg-primary/5" : "border-border")}>
        <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-base sm:text-lg font-medium mb-1">Drop files here or click to browse</p>
        <p className="text-sm text-muted-foreground mb-4">Supports PDF, DOCX, TXT, MD — max 25MB each</p>
        <Input type="file" multiple accept=".pdf,.docx,.txt,.md" className="hidden" id="file-input"
          onChange={(e) => {
            const selected = Array.from(e.target.files || []);
            setFiles((prev) => [...prev, ...selected.map((file) => ({ file, name: file.name, status: "pending" as const, progress: 0 }))]);
          }} />
        <label htmlFor="file-input" className="inline-block px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium cursor-pointer hover:bg-primary/90">
          Browse Files
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h3 className="text-sm font-medium">{files.length} file{files.length > 1 ? "s" : ""} selected</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setFiles([])}>Clear All</Button>
              <Button size="sm" onClick={handleUpload} disabled={files.every((f) => f.status !== "pending")}>
                {files.some((f) => f.status === "uploading") && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                Upload All
              </Button>
            </div>
          </div>
          {files.map((f, i) => (
            <Card key={i}>
              <CardContent className="p-3 flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{(f.file.size / 1024).toFixed(1)} KB</p>
                </div>
                {f.status === "done" && <Check className="h-4 w-4 text-green-500" />}
                {f.status === "error" && <span className="text-xs text-destructive">{f.error}</span>}
                {f.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                <Button variant="ghost" size="icon" onClick={() => removeFile(f.file)} className="h-6 w-6">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
