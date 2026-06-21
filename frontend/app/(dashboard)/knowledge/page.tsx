"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Upload,
  Globe,
  Search,
  FileText,
  Trash2,
  Calendar,
  HardDrive,
  BookOpen,
  X,
  ExternalLink,
  Plus,
  LayoutGrid,
  List,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDate, formatBytes, getStatusColor } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const TYPE_FILTERS = [
  { value: "all", label: "All Types" },
  { value: "pdf", label: "PDF" },
  { value: "docx", label: "DOCX" },
  { value: "txt", label: "TXT" },
  { value: "md", label: "Markdown" },
  { value: "website", label: "Website" },
] as const;

const STATUS_FILTERS = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "ready", label: "Ready" },
  { value: "error", label: "Error" },
] as const;

const TYPE_ICONS: Record<string, string> = {
  pdf: "PDF",
  docx: "DOC",
  txt: "TXT",
  md: "MD",
  website: "WEB",
};

export default function KnowledgePage() {
  const { currentWorkspace } = useWorkspaceStore();
  const wsId = currentWorkspace?.id || "placeholder";
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setViewMode("cards");
    }
  }, []);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["documents", wsId, typeFilter, statusFilter],
    queryFn: async () => {
      try {
        const params: Record<string, string> = {};
        if (typeFilter !== "all") params.source_type = typeFilter;
        if (statusFilter !== "all") params.status = statusFilter;
        const res = await api.get<{
          data: Array<{
            id: string;
            name: string;
            source_type: string;
            status: string;
            file_size: number | null;
            mime_type: string | null;
            created_at: string | null;
          }>;
        }>(`/workspaces/${wsId}/documents`, params);
        return res.data || [];
      } catch (e) {
        toast.error("Failed to load documents");
        throw e;
      }
    },
  });

  const handleDelete = async (docId: string) => {
    try {
      await api.delete(`/workspaces/${wsId}/documents/${docId}`);
      toast.success("Document deleted successfully");
      refetch();
    } catch {
      toast.error("Failed to delete document");
    }
  };

  if (isError) {
    return (
      <div className="page-container py-6">
        <ErrorState
          title="Failed to load documents"
          message={(error as Error)?.message || "An unexpected error occurred"}
          onRetry={refetch}
        />
      </div>
    );
  }

  const documents = data || [];
  const filtered = documents.filter(
    (d) => !search || d.name.toLowerCase().includes(search.toLowerCase())
  );

  const hasActiveFilters = typeFilter !== "all" || statusFilter !== "all" || search !== "";

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-sm shadow-primary/20 flex-shrink-0">
            <BookOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="heading-1">
              Knowledge Base
            </h1>
            <p className="body-sm mt-0.5">
              Upload documents and connect websites to build your AI knowledge
              sources.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* View Toggle */}
          <div className="flex items-center gap-1 border border-border bg-muted/30 p-0.5 rounded-lg mr-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("table")}
              className={cn("h-8 w-8 rounded-md transition-all active:scale-95", viewMode === "table" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
              aria-label="Table view"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("cards")}
              className={cn("h-8 w-8 rounded-md transition-all active:scale-95", viewMode === "cards" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Link href="/knowledge/websites" className="flex-1 sm:flex-initial">
            <Button
              variant="outline"
              className="w-full sm:w-auto active:scale-95"
            >
              <Globe className="h-4 w-4 mr-2" />
              Add Website
            </Button>
          </Link>
          <Link href="/knowledge/upload" className="flex-1 sm:flex-initial">
            <Button className="w-full sm:w-auto active:scale-95">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Search + Filters ───────────────────────────────────── */}
      <Card className="border-border/60">
        <CardContent className="p-3 sm:p-4 space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents by name..."
              className="pl-10 pr-10 h-10"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors active:scale-90"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Mobile Filter Toggle Accordion Header */}
          <div className="flex sm:hidden items-center justify-between border-t border-border/20 pt-2 mt-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Filter Options
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="h-7 text-xs text-primary active:scale-95"
            >
              {showMobileFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>

          {/* Pill-style filters */}
          <div className={cn(
            "flex-col sm:flex sm:flex-row gap-3 sm:gap-4",
            showMobileFilters ? "flex" : "hidden"
          )}>
            {/* Type pills */}
            <div className="flex-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Type
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TYPE_FILTERS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTypeFilter(t.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 active:scale-95",
                      typeFilter === t.value
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status pills */}
            <div className="flex-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Status
              </p>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_FILTERS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStatusFilter(s.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 active:scale-95",
                      statusFilter === s.value
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active filters summary */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">
                Showing {filtered.length} of {documents.length} documents
              </span>
              <button
                onClick={() => {
                  setTypeFilter("all");
                  setStatusFilter("all");
                  setSearch("");
                }}
                className="text-xs text-primary hover:underline active:scale-95"
              >
                Clear all
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Content ────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16">
            <EmptyState
              icon={
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-primary/60" />
                </div>
              }
              title={hasActiveFilters ? "No matching documents" : "No documents yet"}
              description={
                hasActiveFilters
                  ? "Try adjusting your filters or search query to find what you're looking for."
                  : "Upload your first document or connect a website to start building your knowledge base."
              }
              action={
                hasActiveFilters
                  ? {
                      label: "Clear Filters",
                      onClick: () => {
                        setTypeFilter("all");
                        setStatusFilter("all");
                        setSearch("");
                      },
                    }
                  : { label: "Upload Document", href: "/knowledge/upload" }
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === "cards" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 animate-fade-in">
              {filtered.map((doc) => (
                <Card
                  key={doc.id}
                  className="card-hover overflow-hidden active:scale-[0.99] transition-transform"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Type icon badge */}
                      <div
                        className={cn(
                          "h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 text-[10px] font-bold tracking-wide border",
                          doc.status === "ready"
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400"
                            : doc.status === "error"
                            ? "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400"
                            : doc.status === "processing"
                            ? "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400"
                            : "bg-primary/10 text-primary border-primary/20"
                        )}
                      >
                        {doc.source_type === "website"
                          ? <Globe className="h-5 w-5" />
                          : <span>{TYPE_ICONS[doc.source_type] || "DOC"}</span>}
                      </div>

                      {/* Document info */}
                      <div className="flex-1 min-w-0">
                        <a
                          href={`/knowledge/${doc.id}`}
                          className="text-sm font-semibold hover:text-primary transition-colors line-clamp-1 inline-flex items-center gap-1"
                        >
                          {doc.name}
                          <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        </a>

                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge
                            className={cn(
                              getStatusColor(doc.status),
                              "text-[10px] px-2 py-0"
                            )}
                            variant="outline"
                          >
                            {doc.status}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground uppercase font-medium">
                            {doc.source_type}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                          {doc.file_size && (
                            <span className="flex items-center gap-1">
                              <HardDrive className="h-3 w-3" />
                              {formatBytes(doc.file_size)}
                            </span>
                          )}
                          {doc.created_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(doc.created_at)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive active:scale-90"
                          onClick={() => handleDelete(doc.id)}
                          aria-label={`Delete ${doc.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="animate-fade-in">
              <Card className="overflow-hidden border-border/60">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30">
                        <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3.5">
                          Document
                        </th>
                        <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3.5 w-28">
                          Type
                        </th>
                        <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3.5 w-28">
                          Status
                        </th>
                        <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3.5 w-24">
                          Size
                        </th>
                        <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3.5 w-36">
                          Created
                        </th>
                        <th className="w-14 px-3 py-3.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filtered.map((doc) => (
                        <tr
                          key={doc.id}
                          className="group hover:bg-muted/40 transition-colors duration-150"
                        >
                          {/* Name */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 text-[9px] font-bold tracking-wide border",
                                  doc.status === "ready"
                                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400"
                                    : doc.status === "error"
                                    ? "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400"
                                    : doc.status === "processing"
                                    ? "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400"
                                    : "bg-primary/10 text-primary border-primary/20"
                                )}
                              >
                                {doc.source_type === "website"
                                  ? <Globe className="h-4 w-4" />
                                  : <span>{TYPE_ICONS[doc.source_type] || "DOC"}</span>}
                              </div>
                              <a
                                href={`/knowledge/${doc.id}`}
                                className="text-sm font-medium hover:text-primary transition-colors inline-flex items-center gap-1.5 group/link"
                              >
                                <span className="line-clamp-1">
                                  {doc.name}
                                </span>
                                <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0" />
                              </a>
                            </div>
                          </td>

                          {/* Type */}
                          <td className="px-4 py-3.5">
                            <span className="text-xs font-medium text-muted-foreground uppercase bg-muted rounded-md px-2 py-1 inline-block">
                              {doc.source_type}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5">
                            <Badge
                              className={cn(
                                getStatusColor(doc.status),
                                "text-xs px-2.5 py-0.5"
                              )}
                              variant="outline"
                            >
                              {doc.status}
                            </Badge>
                          </td>

                          {/* Size */}
                          <td className="px-4 py-3.5 text-sm text-muted-foreground tabular-nums">
                            {doc.file_size ? formatBytes(doc.file_size) : "—"}
                          </td>

                          {/* Created */}
                          <td className="px-4 py-3.5 text-sm text-muted-foreground">
                            {doc.created_at ? formatDate(doc.created_at) : "—"}
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-3.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-60 hover:opacity-100 group-hover:opacity-100 focus-visible:opacity-100 focus:opacity-100 transition-all duration-150 active:scale-90"
                              onClick={() => handleDelete(doc.id)}
                              aria-label={`Delete ${doc.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Table footer */}
                <div className="border-t border-border/60 bg-muted/20 px-5 py-3 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Showing{" "}
                    <span className="font-semibold text-foreground">
                      {filtered.length}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-foreground">
                      {documents.length}
                    </span>{" "}
                    documents
                  </p>
                </div>
              </Card>
            </div>
          )}

          {/* Mobile FAB-style add button */}
          <div className="sm:hidden flex justify-center pt-2">
            <Link href="/knowledge/upload">
              <Button size="sm" className="active:scale-95 shadow-sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Add Document
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
