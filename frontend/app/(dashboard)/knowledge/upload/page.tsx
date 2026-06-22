"use client";
import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Upload, FileText, X, Check, Loader2, CloudUpload, File, FileType, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useWorkspaceStore } from "@/stores";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";


interface UploadFile {
  file: File;
  name: string;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
];



function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return <FileType className="h-5 w-5 text-red-500" />;
    case "docx":
      return <FileText className="h-5 w-5 text-blue-500" />;
    case "md":
      return <FileText className="h-5 w-5 text-purple-500" />;
    case "txt":
      return <File className="h-5 w-5 text-muted-foreground" />;
    default:
      return <File className="h-5 w-5 text-muted-foreground" />;
  }
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function GitHubImportSection({ wsId }: { wsId: string }) {
  const [repoUrl, setRepoUrl] = useState("");
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    if (!repoUrl.trim()) return;
    setImporting(true);
    try {
      const result = await api.post<Array<Record<string, unknown>>>(`/workspaces/${wsId}/github/import`, {
        repo_url: repoUrl.trim(),
      });
      toast.success(`Imported ${result.length} file(s) from GitHub`);
      setRepoUrl("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed";
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900/10 flex-shrink-0 mt-0.5">
            <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.73.083-.73 1.205.085 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12 24 5.37 18.63 0 12 0z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-1">Import from GitHub</h4>
            <p className="text-xs text-muted-foreground">
              Fetch README, docs/ and wiki/ files from any public repository
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="https://github.com/owner/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !importing) handleImport(); }}
            className="flex-1 text-sm"
          />
          <Button
            size="sm"
            onClick={handleImport}
            disabled={!repoUrl.trim() || importing}
            className="active:scale-95 transition-transform gap-2"
          >
            {importing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {importing ? "Importing..." : "Import"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
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
      const res = await api.postFormData(`/workspaces/${wsId}/documents`, formData);
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
      ACCEPTED_TYPES.includes(f.type) || f.name.endsWith(".md")
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

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const uploadingCount = files.filter((f) => f.status === "uploading").length;
  const doneCount = files.filter((f) => f.status === "done").length;
  const errorCount = files.filter((f) => f.status === "error").length;

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 px-4 sm:px-6 animate-fade-in">
        {/* Header Skeleton */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6 sm:p-8">
          <div className="absolute inset-0 skeleton-shimmer" />
          <div className="relative space-y-3">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-80" />
          </div>
        </div>

        {/* Drop Zone Skeleton */}
        <Skeleton className="h-56 w-full rounded-2xl" />

        {/* File List Skeleton */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-36" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-8 w-8 rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-6 pb-8 animate-fade-in">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6 sm:p-8">
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
        <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/25 flex-shrink-0">
            <CloudUpload className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Upload Documents</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Add PDF, DOCX, TXT, or Markdown files to your knowledge base
            </p>
          </div>
        </div>
      </div>

      {/* ─── Drop Zone ──────────────────────────────────────── */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={cn(
          "relative group rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all duration-300 cursor-pointer",
          dragOver
            ? "border-primary bg-primary/5 scale-[1.01] shadow-lg shadow-primary/10"
            : "border-border/60 hover:border-primary/40 hover:bg-primary/[0.02] hover:shadow-md"
        )}
      >
        {/* Background decoration */}
        <div className={cn(
          "absolute inset-0 rounded-2xl transition-opacity duration-300",
          dragOver ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          <div className="absolute inset-x-4 top-4 bottom-4 rounded-xl border border-dashed border-primary/20" />
        </div>

        <div className="relative">
          <div className={cn(
            "mx-auto mb-5 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl transition-all duration-300",
            dragOver
              ? "bg-primary/15 scale-110 rotate-3"
              : "bg-muted/60 group-hover:bg-primary/10 group-hover:scale-105"
          )}>
            <Upload className={cn(
              "h-8 w-8 sm:h-10 sm:w-10 transition-colors duration-300",
              dragOver ? "text-primary" : "text-muted-foreground group-hover:text-primary/70"
            )} />
          </div>

          <p className="text-lg sm:text-xl font-semibold mb-1.5">
            {dragOver ? "Drop files here" : "Drag & drop files here"}
          </p>
          <p className="text-sm text-muted-foreground mb-5">
            or click below to browse from your device
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            {["PDF", "DOCX", "TXT", "MD"].map((fmt) => (
              <Badge key={fmt} variant="secondary" className="text-xs font-medium px-2.5 py-1">
                {fmt}
              </Badge>
            ))}
            <span className="text-xs text-muted-foreground ml-1">up to 25MB each</span>
          </div>

          <Input
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md"
            className="hidden"
            id="file-input"
            onChange={(e) => {
              const selected = Array.from(e.target.files || []);
              setFiles((prev) => [...prev, ...selected.map((file) => ({ file, name: file.name, status: "pending" as const, progress: 0 }))]);
            }}
          />
          <label
            htmlFor="file-input"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold cursor-pointer hover:bg-primary/90 active:scale-95 transition-all duration-150 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
          >
            <Upload className="h-4 w-4" />
            Browse Files
          </label>
        </div>
      </div>

      {/* ─── File List ──────────────────────────────────────── */}
      {files.length > 0 && (
        <div className="space-y-4 sm:space-y-5 animate-slide-up">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold">
                {files.length} file{files.length > 1 ? "s" : ""} selected
              </h3>
              {doneCount > 0 && (
                <Badge variant="outline" className="text-xs border-green-500/30 text-green-600 bg-green-500/5">
                  <Check className="h-3 w-3 mr-1" />
                  {doneCount} done
                </Badge>
              )}
              {errorCount > 0 && (
                <Badge variant="outline" className="text-xs border-destructive/30 text-destructive bg-destructive/5">
                  {errorCount} failed
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFiles([])}
                className="active:scale-95 transition-transform"
              >
                Clear All
              </Button>
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={files.every((f) => f.status !== "pending")}
                className="active:scale-95 transition-transform gap-2"
              >
                {uploadingCount > 0 && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {uploadingCount > 0 ? `Uploading ${uploadingCount}...` : `Upload ${pendingCount > 0 ? pendingCount : ""}`}
              </Button>
            </div>
          </div>

          {/* File Cards */}
          <div className="space-y-2">
            {files.map((f, i) => (
              <Card
                key={i}
                className={cn(
                  "transition-all duration-200 animate-scale-in border-border/50",
                  f.status === "done" && "border-green-500/20 bg-green-500/[0.02]",
                  f.status === "error" && "border-destructive/20 bg-destructive/[0.02]",
                  f.status === "uploading" && "border-primary/20 bg-primary/[0.02]",
                  f.status === "pending" && "hover:border-border hover:shadow-sm"
                )}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <CardContent className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                  {/* File type icon */}
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 transition-colors",
                    f.status === "done" && "bg-green-500/10",
                    f.status === "error" && "bg-destructive/10",
                    f.status === "uploading" && "bg-primary/10",
                    f.status === "pending" && "bg-muted/60"
                  )}>
                    {f.status === "done" ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : f.status === "uploading" ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : f.status === "error" ? (
                      <X className="h-5 w-5 text-destructive" />
                    ) : (
                      getFileIcon(f.name)
                    )}
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{f.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground">{formatSize(f.file.size)}</p>
                      {f.status === "error" && (
                        <>
                          <span className="text-xs text-muted-foreground">·</span>
                          <p className="text-xs text-destructive">{f.error}</p>
                        </>
                      )}
                      {f.status === "done" && (
                        <>
                          <span className="text-xs text-muted-foreground">·</span>
                          <p className="text-xs text-green-600 font-medium">Uploaded</p>
                        </>
                      )}
                      {f.status === "uploading" && (
                        <>
                          <span className="text-xs text-muted-foreground">·</span>
                          <p className="text-xs text-primary font-medium animate-pulse">Uploading...</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Remove button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(f.file)}
                    className="h-8 w-8 rounded-lg opacity-60 hover:opacity-100 hover:bg-destructive/10 hover:text-destructive active:scale-90 transition-all flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ─── GitHub Import ──────────────────────────────────── */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-2 text-xs text-muted-foreground">or import from</span>
        </div>
      </div>

      <GitHubImportSection wsId={wsId} />

      {/* ─── Tips / Info ────────────────────────────────────── */}
      {files.length === 0 && (
        <div className="animate-slide-up">
          <Card className="border-border/50 bg-muted/20">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 flex-shrink-0 mt-0.5">
                  <Sparkles className="h-4.5 w-4.5 text-amber-500" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-1">Tips for best results</h4>
                  <ul className="text-xs text-muted-foreground space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      Use clear, descriptive file names for better searchability
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      PDF files with selectable text work better than scanned images
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      Keep individual files under 25MB for faster processing
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      Organize related documents into batches for easier management
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
