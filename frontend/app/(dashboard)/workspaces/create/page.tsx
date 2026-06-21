"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Zap } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores";
import { slugify } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";

export default function CreateWorkspacePage() {
  const router = useRouter();
  const { addWorkspace } = useWorkspaceStore();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [manualSlug, setManualSlug] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!manualSlug) setSlug(slugify(val));
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.post<{ id: string; name: string; slug: string; plan: string; is_active: boolean; created_at: string | null }>("/workspaces", { name, slug: slug || slugify(name) });
      addWorkspace({ id: result.id, name: result.name, slug: result.slug, plan: result.plan, is_active: result.is_active, created_at: result.created_at });
      toast.success("Workspace created successfully!");
      router.push(`/workspaces/${result.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create workspace. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto space-y-6 px-4 sm:px-6 py-6 sm:py-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div>
              <Skeleton className="h-4 w-32 mb-1.5" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div>
              <Skeleton className="h-4 w-28 mb-1.5" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Card className="bg-muted/50">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-14 ml-auto" />
                </div>
                <div className="space-y-2 pt-1">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-36" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </CardContent>
            </Card>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 px-4 sm:px-6 py-6 sm:py-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Create Workspace</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Set up a new workspace for your team</p>
      </div>

      {error && (
        <ErrorState
          title="Creation Failed"
          message={error}
          onRetry={() => setError(null)}
        />
      )}

      <Card>
        <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
          <CardTitle className="text-base sm:text-lg">Workspace Details</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Workspace Name</label>
            <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Acme Corp Support"
              disabled={loading} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Workspace URL</label>
            <div className="flex items-center rounded-md border border-input bg-background overflow-hidden">
              <span className="px-2 sm:px-3 text-xs sm:text-sm text-muted-foreground bg-muted border-r border-input py-2.5 whitespace-nowrap">supportpilot.app/</span>
              <Input value={slug} onChange={(e) => { setSlug(e.target.value); setManualSlug(true); }} placeholder="acme-corp"
                disabled={loading}
                className="border-0 focus-visible:ring-0 rounded-none" />
            </div>
          </div>

          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Free Plan</span>
                <Badge variant="secondary" className="ml-auto">Default</Badge>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-green-500 flex-shrink-0" />2 team members</li>
                <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-green-500 flex-shrink-0" />10 documents</li>
                <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-green-500 flex-shrink-0" />50 messages/day</li>
                <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-green-500 flex-shrink-0" />100MB storage</li>
              </ul>
            </CardContent>
          </Card>

          <Button onClick={handleCreate} disabled={!name || loading}
            className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Workspace...
              </>
            ) : (
              "Create Workspace"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
