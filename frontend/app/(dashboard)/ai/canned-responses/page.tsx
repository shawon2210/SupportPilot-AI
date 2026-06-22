"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

interface CannedResponse {
  id: string;
  title: string;
  content: string;
  shortcut?: string;
  category?: string;
  tags?: string[];
  usage_count: number;
}

export default function CannedResponsesPage() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspaceStore();
  const wsId = currentWorkspace?.id || "";

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CannedResponse | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [shortcut, setShortcut] = useState("");
  const [category, setCategory] = useState("");

  const { data: responses = [], isLoading } = useQuery<CannedResponse[]>({
    queryKey: ["canned-responses", wsId],
    queryFn: () => api.get(`/workspaces/${wsId}/canned-responses`),
    enabled: !!wsId,
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => api.post(`/workspaces/${wsId}/canned-responses`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["canned-responses", wsId] }); toast.success("Created"); setDialogOpen(false); reset(); },
    onError: () => toast.error("Failed to create"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => api.put(`/workspaces/${wsId}/canned-responses/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["canned-responses", wsId] }); toast.success("Updated"); setDialogOpen(false); reset(); },
    onError: () => toast.error("Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/workspaces/${wsId}/canned-responses/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["canned-responses", wsId] }); toast.success("Deleted"); },
    onError: () => toast.error("Failed to delete"),
  });

  function reset() { setTitle(""); setContent(""); setShortcut(""); setCategory(""); setEditing(null); }

  function openCreate() { reset(); setDialogOpen(true); }

  function openEdit(r: CannedResponse) { setEditing(r); setTitle(r.title); setContent(r.content); setShortcut(r.shortcut || ""); setCategory(r.category || ""); setDialogOpen(true); }

  function handleSave() {
    if (!title.trim() || !content.trim()) { toast.error("Title and content are required"); return; }
    const body = { title: title.trim(), content: content.trim(), shortcut: shortcut.trim() || undefined, category: category.trim() || undefined };
    if (editing) updateMutation.mutate({ id: editing.id, body });
    else createMutation.mutate(body);
  }

  const filtered = responses.filter((r) =>
    !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.content.toLowerCase().includes(search.toLowerCase()) || r.shortcut?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Canned Responses</h1>
          <p className="text-sm text-muted-foreground mt-1">Pre-written templates for quick replies in chat.</p>
        </div>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1.5" />New Response</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search responses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardHeader><CardTitle>{filtered.length} responses</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> :
          filtered.length === 0 ? (
            <EmptyState icon={<MessageSquare className="h-8 w-8" />} title="No responses yet" description="Create your first canned response." />
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((r) => (
                <div key={r.id} className="flex items-start justify-between py-3 gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{r.title}</span>
                      {r.shortcut && <Badge variant="outline" className="text-[10px] font-mono">/{r.shortcut}</Badge>}
                      {r.category && <Badge variant="secondary" className="text-[10px]">{r.category}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.content}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Used {r.usage_count} times</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setDialogOpen(false); reset(); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Response" : "New Response"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Greeting" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shortcut">Shortcut <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="shortcut" value={shortcut} onChange={(e) => setShortcut(e.target.value)} placeholder="hi" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="General" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} rows={6} placeholder="Hi! How can I help you today?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); reset(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={!title.trim() || !content.trim() || createMutation.isPending || updateMutation.isPending}>
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
