"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Tag {
  id: string;
  name: string;
  color: string;
}

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

export default function TagsPage() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspaceStore();
  const wsId = currentWorkspace?.id || "";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");

  const { data: tags = [], isLoading } = useQuery<Tag[]>({
    queryKey: ["tags", wsId],
    queryFn: () => api.get<Tag[]>(`/workspaces/${wsId}/tags`),
    enabled: !!wsId,
  });

  const createMutation = useMutation({
    mutationFn: (body: { name: string; color: string }) => api.post(`/workspaces/${wsId}/tags`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags", wsId] });
      toast.success("Tag created");
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error("Failed to create tag"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name?: string; color?: string } }) => api.put(`/workspaces/${wsId}/tags/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags", wsId] });
      toast.success("Tag updated");
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error("Failed to update tag"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/workspaces/${wsId}/tags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags", wsId] });
      toast.success("Tag deleted");
    },
    onError: () => toast.error("Failed to delete tag"),
  });

  function resetForm() {
    setName("");
    setColor("#6366f1");
    setEditingTag(null);
  }

  function openCreate() {
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(tag: Tag) {
    setEditingTag(tag);
    setName(tag.name);
    setColor(tag.color);
    setDialogOpen(true);
  }

  function handleSave() {
    if (!name.trim()) return toast.error("Name is required");
    if (editingTag) {
      updateMutation.mutate({ id: editingTag.id, body: { name: name.trim(), color } });
    } else {
      createMutation.mutate({ name: name.trim(), color });
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chat Tags</h1>
          <p className="text-sm text-muted-foreground mt-1">Create and manage tags to categorise conversations.</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />New Tag
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Tags ({tags.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : tags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tags yet. Create your first tag.</p>
          ) : (
            <div className="divide-y divide-border">
              {tags.map((tag) => (
                <div key={tag.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded-full" style={{ backgroundColor: tag.color }} />
                    <span className="text-sm font-medium">{tag.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(tag)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(tag.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTag ? "Edit Tag" : "Create Tag"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. billing" />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name.trim() || createMutation.isPending || updateMutation.isPending}>
              {editingTag ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
