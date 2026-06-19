"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, X, Crown, Puzzle } from "lucide-react";
import { useWorkspaceStore } from "@/stores";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const featureList = [
  { key: "chat", name: "AI Chat", desc: "Basic AI chat functionality", tier: "free" },
  { key: "document_upload", name: "Document Upload", desc: "Upload documents to knowledge base", tier: "free" },
  { key: "knowledge_search", name: "Knowledge Search", desc: "Search knowledge base", tier: "free" },
  { key: "widget", name: "Embeddable Widget", desc: "Deploy chat widget on your site", tier: "free" },
  { key: "custom_branding", name: "Custom Branding", desc: "Custom widget colors and logo", tier: "starter" },
  { key: "team_members", name: "Team Members", desc: "Invite and manage team members", tier: "starter" },
  { key: "conversation_history", name: "Conversation History", desc: "View past conversations", tier: "starter" },
  { key: "api_access", name: "API Access", desc: "Programmatic API access", tier: "pro" },
  { key: "webhooks", name: "Webhooks", desc: "Event-driven integrations", tier: "pro" },
  { key: "advanced_analytics", name: "Advanced Analytics", desc: "Detailed usage analytics", tier: "pro" },
  { key: "ticket_classification", name: "Ticket Classification", desc: "AI-powered ticket categorization", tier: "pro" },
  { key: "suggested_replies", name: "Suggested Replies", desc: "AI-generated reply suggestions", tier: "pro" },
  { key: "knowledge_gap_detection", name: "Knowledge Gap Detection", desc: "Identify missing documentation", tier: "pro" },
  { key: "slack_integration", name: "Slack Integration", desc: "Connect with Slack workspace", tier: "pro" },
  { key: "sso", name: "SSO", desc: "Single Sign-On authentication", tier: "enterprise" },
  { key: "audit_logs", name: "Audit Logs", desc: "Full activity audit trail", tier: "enterprise" },
  { key: "custom_model", name: "Custom Model", desc: "Use custom AI model", tier: "enterprise" },
  { key: "sla_guarantee", name: "SLA Guarantee", desc: "99.9% uptime guarantee", tier: "enterprise" },
  { key: "dedicated_support", name: "Dedicated Support", desc: "Priority support channel", tier: "enterprise" },
];

const tierColors: Record<string, string> = {
  free: "bg-green-500/10 text-green-500 border-green-500/20",
  starter: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  pro: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  enterprise: "bg-orange-500/10 text-orange-500 border-orange-500/20",
};

function FeatureSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 gap-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded-full flex-shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <Skeleton className="h-5 w-16 rounded-full self-start sm:self-auto" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function FeatureList({ plan }: { plan: string }) {
  const tierOrder = ["free", "starter", "pro", "enterprise"];
  const planLevel = tierOrder.indexOf(plan);

  if (featureList.length === 0) {
    return (
      <EmptyState
        icon={<Puzzle className="h-10 w-10" />}
        title="No features available"
        description="There are no features to display at this time."
      />
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {featureList.map((feature) => {
            const featureLevel = tierOrder.indexOf(feature.tier);
            const enabled = featureLevel <= planLevel;
            return (
              <div key={feature.key} className={cn("flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 gap-2", !enabled && "opacity-60")}>
                <div className="flex items-center gap-3">
                  {enabled ? (
                    <div className="h-5 w-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-green-500" />
                    </div>
                  ) : feature.tier !== "free" ? (
                    <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Crown className="h-3 w-3 text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <X className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{feature.name}</p>
                    <p className="text-xs text-muted-foreground">{feature.desc}</p>
                  </div>
                </div>
                <Badge variant="outline" className={cn("self-start sm:self-auto text-xs", tierColors[feature.tier])}>
                  {feature.tier.charAt(0).toUpperCase() + feature.tier.slice(1)}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function FeaturesPage() {
  const { currentWorkspace } = useWorkspaceStore();

  const { data: plan, isLoading, isError, refetch } = useQuery({
    queryKey: ["workspace-plan", currentWorkspace?.id],
    queryFn: async () => {
      try {
        await new Promise((r) => setTimeout(r, 300));
        return currentWorkspace?.plan || "free";
      } catch (e) {
        toast.error("Failed to load plan features");
        return "free";
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 px-4 sm:px-6">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <FeatureSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 px-4 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">Feature Flags</CardTitle>
          </CardHeader>
          <CardContent>
            <ErrorState
              title="Failed to load features"
              message="We couldn't load the feature list. Please try again."
              onRetry={() => refetch()}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4 sm:px-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Feature Flags</h1>
        <p className="text-muted-foreground">
          Your plan: <Badge variant="outline" className="ml-1 text-xs">{plan || "free"}</Badge> — features marked with a crown require an upgrade
        </p>
      </div>
      <FeatureList plan={plan || "free"} />
    </div>
  );
}
