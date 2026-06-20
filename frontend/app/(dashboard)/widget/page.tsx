"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Palette, Copy, Check, Globe, Code, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";

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
      } catch (err) {
        toast.error("Failed to load widget configuration");
        return null;
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: typeof config) => api.patch(`/workspaces/${wsId}/widget`, updates),
    onSuccess: () => toast.success("Widget configuration saved"),
    onError: () => toast.error("Failed to save widget configuration"),
  });

  const embedCode = `<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://api.supportpilot.ai'}/api/v1/widget/${wsId}.js"></script>`;

  const copyEmbed = () => { navigator.clipboard.writeText(embedCode); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-2 sm:px-4 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
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
      <div className="max-w-4xl mx-auto px-2 sm:px-4">
        <ErrorState
          title="Failed to load widget"
          message="Could not load the widget configuration. Please try again."
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Widget Builder</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Customize and embed the AI chat widget on your website</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left column: form + embed code */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="p-3 sm:p-4 pb-0 sm:pb-0">
              <CardTitle className="text-sm flex items-center gap-2"><Palette className="h-4 w-4" />Customize</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Theme</label>
                <select value={config.theme} onChange={(e) => setConfig({ ...config, theme: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm">
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Brand Color</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input type="color" value={config.primary_color} onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                    className="h-10 w-full sm:w-14 rounded-md border border-input cursor-pointer" />
                  <Input value={config.primary_color} onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                    className="w-full flex-1" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Greeting Message</label>
                <Input value={config.greeting_message} onChange={(e) => setConfig({ ...config, greeting_message: e.target.value })} />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Placeholder</label>
                <Input value={config.placeholder_text} onChange={(e) => setConfig({ ...config, placeholder_text: e.target.value })} />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Position</label>
                <select value={config.position} onChange={(e) => setConfig({ ...config, position: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm">
                  <option value="right">Bottom Right</option>
                  <option value="left">Bottom Left</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" checked={config.show_branding} onChange={(e) => setConfig({ ...config, show_branding: e.target.checked })} id="branding" className="rounded" />
                <label htmlFor="branding" className="text-sm">Show SupportPilot branding</label>
              </div>

              <Button onClick={() => updateMutation.mutate(config)} disabled={updateMutation.isPending}
                className="w-full">
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Save Changes
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3 sm:p-4 pb-0 sm:pb-0">
              <CardTitle className="text-sm flex items-center gap-2"><Code className="h-4 w-4" />Embed Code</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <code className="flex-1 px-3 py-2 rounded-md bg-muted text-xs font-mono overflow-x-auto whitespace-nowrap">{embedCode}</code>
                <Button variant="outline" onClick={copyEmbed} className="flex-shrink-0 self-start sm:self-auto">
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>React/Next.js:</strong> Use the script tag above in your _document.tsx or layout</p>
                <p><strong>WordPress:</strong> Add to header via Insert Headers and Footers plugin</p>
                <p><strong>Shopify:</strong> Add to theme.liquid before &lt;/body&gt;</p>
                <p><strong>HTML:</strong> Paste before &lt;/body&gt; tag</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: preview — full width on mobile */}
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-0 sm:pb-0">
            <CardTitle className="text-sm">Live Preview</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <div className={cn("rounded-lg border-2 h-80 sm:h-96 relative overflow-hidden", config.theme === "dark" ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-200")}>
              <div className={cn("absolute bottom-4", config.position === "right" ? "right-4" : "left-4")}>
                <div className="w-full max-w-[256px] sm:max-w-[288px] mx-auto rounded-xl shadow-2xl overflow-hidden" style={{ borderColor: config.primary_color + "40" }}>
                  <div className="px-4 py-3 text-white text-sm font-medium" style={{ backgroundColor: config.primary_color }}>
                    {config.greeting_message}
                  </div>
                  <div className={cn("p-3", config.theme === "dark" ? "bg-gray-800" : "bg-white")}>
                    <div className={cn("rounded-lg px-3 py-2 text-sm", config.theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-500")}>
                      {config.placeholder_text}
                    </div>
                  </div>
                  {config.show_branding && (
                    <div className={cn("px-3 py-1.5 text-[10px] text-center", config.theme === "dark" ? "bg-gray-800 text-gray-500" : "bg-gray-50 text-gray-400")}>
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
