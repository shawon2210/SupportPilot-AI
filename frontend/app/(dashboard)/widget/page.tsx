"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Palette, Copy, Check, Code, Loader2, Sparkles, Monitor, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function WidgetPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const wsId = currentWorkspace?.id || "placeholder";
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState({
    theme: "light",
    primary_color: "#3B82F6",
    greeting_message: "Hi! How can I help you?",
    placeholder_text: "Type your message...",
    position: "right",
    show_branding: true,
  });

  const { data: widgetConfig, isLoading, isError, refetch } = useQuery({
    queryKey: ["widget-config", wsId],
    queryFn: async () => {
      try {
        const res = await api.get<{ id: string; workspace_id: string; theme: string; primary_color: string; greeting_message: string; placeholder_text: string; position: string; show_branding: boolean; is_active: boolean }>(`/workspaces/${wsId}/widget`);
        return res;
      } catch {
        return null;
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: typeof config) => api.patch(`/workspaces/${wsId}/widget`, updates),
    onSuccess: () => toast.success("Widget configuration saved"),
    onError: () => toast.error("Failed to save widget configuration"),
  });

  const embedCode = `<script src="${typeof window !== "undefined" ? window.location.origin : "https://api.supportpilot.ai"}/api/v1/widget/${wsId}.js"></script>`;

  const copyEmbed = () => { navigator.clipboard.writeText(embedCode); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-6 space-y-6 animate-fade-in">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-4">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-6">
        <ErrorState
          title="Failed to load widget"
          message="Could not load the widget configuration. Please try again."
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Widget Builder</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Customize and embed the AI chat widget on your website</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left column: form + embed code */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                Customize Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-4">
              {/* Theme */}
              <div>
                <label className="block text-xs font-medium mb-1.5">Theme</label>
                <Tabs value={config.theme} onValueChange={(v) => setConfig({ ...config, theme: v })} className="w-full">
                  <TabsList className="grid grid-cols-2">
                    <TabsTrigger value="light" className="text-xs">
                      <Monitor className="h-3.5 w-3.5 mr-1.5" />Light
                    </TabsTrigger>
                    <TabsTrigger value="dark" className="text-xs">
                      <Smartphone className="h-3.5 w-3.5 mr-1.5" />Dark
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Brand Color */}
              <div>
                <label className="block text-xs font-medium mb-1.5">Brand Color</label>
                <div className="flex gap-2">
                  <input type="color" value={config.primary_color} onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                    className="h-10 w-12 rounded-md border border-input cursor-pointer flex-shrink-0" />
                  <Input value={config.primary_color} onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                    className="flex-1 font-mono text-sm" />
                </div>
              </div>

              {/* Greeting Message */}
              <div>
                <label className="block text-xs font-medium mb-1.5">Greeting Message</label>
                <Input value={config.greeting_message} onChange={(e) => setConfig({ ...config, greeting_message: e.target.value })} />
              </div>

              {/* Placeholder */}
              <div>
                <label className="block text-xs font-medium mb-1.5">Input Placeholder</label>
                <Input value={config.placeholder_text} onChange={(e) => setConfig({ ...config, placeholder_text: e.target.value })} />
              </div>

              {/* Position */}
              <div>
                <label className="block text-xs font-medium mb-1.5">Position</label>
                <Tabs value={config.position} onValueChange={(v) => setConfig({ ...config, position: v })} className="w-full">
                  <TabsList className="grid grid-cols-2">
                    <TabsTrigger value="right" className="text-xs">Bottom Right</TabsTrigger>
                    <TabsTrigger value="left" className="text-xs">Bottom Left</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Branding toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                <div>
                  <p className="text-sm font-medium">Show Branding</p>
                  <p className="text-[11px] text-muted-foreground">Display &quot;Powered by SupportPilot&quot;</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={config.show_branding}
                  onClick={() => setConfig({ ...config, show_branding: !config.show_branding })}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0",
                    config.show_branding ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
                    config.show_branding ? "translate-x-6" : "translate-x-1"
                  )} />
                </button>
              </div>

              <Button onClick={() => updateMutation.mutate(config)} disabled={updateMutation.isPending}
                className="w-full h-10">
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Embed Code */}
          <Card>
            <CardHeader className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Code className="h-4 w-4 text-primary" />
                Embed Code
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
              <div className="flex gap-2">
                <code className="flex-1 px-3 py-2.5 rounded-lg bg-muted text-xs font-mono overflow-x-auto whitespace-nowrap border border-border/50">
                  {embedCode}
                </code>
                <Button variant="outline" onClick={copyEmbed} className="flex-shrink-0 h-auto px-3 active:scale-95">
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="text-[11px] text-muted-foreground space-y-1.5 p-3 rounded-lg bg-muted/50">
                <p><strong>React/Next.js:</strong> Add to _document.tsx or root layout</p>
                <p><strong>WordPress:</strong> Use Insert Headers and Footers plugin</p>
                <p><strong>Shopify:</strong> Add to theme.liquid before &lt;/body&gt;</p>
                <p><strong>HTML:</strong> Paste before &lt;/body&gt; tag</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: preview */}
        <Card className="lg:sticky lg:top-20 lg:self-start">
          <CardHeader className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2">
            <CardTitle className="text-sm font-semibold">Live Preview</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
            <div className={cn(
              "rounded-xl border-2 h-80 sm:h-[420px] relative overflow-hidden transition-colors",
              config.theme === "dark" ? "bg-gray-900 border-gray-700" : "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200"
            )}>
              {/* Fake website content */}
              <div className="absolute inset-0 p-4 opacity-30">
                <div className="h-4 w-32 rounded bg-current mb-3" />
                <div className="h-3 w-full rounded bg-current mb-2" />
                <div className="h-3 w-3/4 rounded bg-current mb-4" />
                <div className="h-20 w-full rounded bg-current mb-2" />
                <div className="h-3 w-5/6 rounded bg-current mb-2" />
                <div className="h-3 w-2/3 rounded bg-current" />
              </div>

              {/* Widget preview */}
              <div className={cn("absolute bottom-4", config.position === "right" ? "right-4" : "left-4")}>
                <div className="w-64 sm:w-72 rounded-xl shadow-2xl overflow-hidden border" style={{ borderColor: config.primary_color + "30" }}>
                  <div className="px-4 py-3 text-white text-sm font-medium" style={{ backgroundColor: config.primary_color }}>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      {config.greeting_message}
                    </div>
                  </div>
                  <div className={cn("p-3", config.theme === "dark" ? "bg-gray-800" : "bg-white")}>
                    <div className={cn(
                      "rounded-lg px-3 py-2.5 text-sm border-0",
                      config.theme === "dark" ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-400"
                    )}>
                      {config.placeholder_text}
                    </div>
                  </div>
                  {config.show_branding && (
                    <div className={cn(
                      "px-3 py-1.5 text-[10px] text-center",
                      config.theme === "dark" ? "bg-gray-800 text-gray-500" : "bg-gray-50 text-gray-400"
                    )}>
                      Powered by SupportPilot
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
