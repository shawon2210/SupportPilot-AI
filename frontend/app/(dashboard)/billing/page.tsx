"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, CreditCard, Loader2, Sparkles, Zap, ArrowRight, Crown, Shield, Users, Building2 } from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

const plans = [
  { id: "free", name: "Free", price: 0, description: "Perfect for individuals getting started", features: ["2 team members", "10 documents", "50 messages/day", "100MB storage", "Basic support"], icon: Shield },
  { id: "starter", name: "Starter", price: 29, description: "Best for growing small teams", features: ["5 team members", "100 documents", "500 messages/day", "1GB storage", "Email support", "Custom branding"], popular: true, icon: Zap },
  { id: "pro", name: "Pro", price: 99, description: "For scaling businesses", features: ["25 team members", "1,000 documents", "5,000 messages/day", "10GB storage", "Priority support", "API access", "Analytics"], icon: Crown },
  { id: "enterprise", name: "Enterprise", price: -1, description: "For large organizations", features: ["Unlimited members", "Unlimited documents", "Unlimited messages", "Unlimited storage", "Dedicated support", "SLA guarantee", "Custom integrations"], icon: Building2 },
];

const allFeatures = [
  "Team members",
  "Documents",
  "Messages/day",
  "Storage",
  "Support level",
  "Custom branding",
  "API access",
  "Analytics",
  "SLA guarantee",
  "Custom integrations",
];

function getFeatureValue(planId: string): Record<string, string> {
  const values: Record<string, Record<string, string>> = {
    free: { "Team members": "2", "Documents": "10", "Messages/day": "50", "Storage": "100MB", "Support level": "Basic", "Custom branding": "—", "API access": "—", "Analytics": "—", "SLA guarantee": "—", "Custom integrations": "—" },
    starter: { "Team members": "5", "Documents": "100", "Messages/day": "500", "Storage": "1GB", "Support level": "Email", "Custom branding": "✓", "API access": "—", "Analytics": "—", "SLA guarantee": "—", "Custom integrations": "—" },
    pro: { "Team members": "25", "Documents": "1,000", "Messages/day": "5,000", "Storage": "10GB", "Support level": "Priority", "Custom branding": "✓", "API access": "✓", "Analytics": "✓", "SLA guarantee": "—", "Custom integrations": "—" },
    enterprise: { "Team members": "Unlimited", "Documents": "Unlimited", "Messages/day": "Unlimited", "Storage": "Unlimited", "Support level": "Dedicated", "Custom branding": "✓", "API access": "✓", "Analytics": "✓", "SLA guarantee": "✓", "Custom integrations": "✓" },
  };
  return values[planId] || {};
}

export default function BillingPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const wsId = currentWorkspace?.id || "placeholder";
  const [loading, setLoading] = useState<string | null>(null);

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription", wsId],
    queryFn: async () => {
      try {
        const res = await api.get<{ data: { id: string; plan: string; status: string; current_period_end: string | null; cancel_at_period_end: boolean } | null }>(`/workspaces/${wsId}/billing/subscription`);
        return res.data;
      } catch { return null; }
    },
  });

  const currentPlan = subscription?.plan || "free";

  const handleUpgrade = async (planId: string) => {
    setLoading(planId);
    try {
      const res = await api.post<{ data: { checkout_url: string } }>(`/workspaces/${wsId}/billing/checkout`, { plan: planId });
      if (res.data?.checkout_url) window.location.href = res.data.checkout_url;
    } catch (e) { console.error(e); } finally { setLoading(null); }
  };

  const handlePortal = async () => {
    setLoading("portal");
    try {
      const res = await api.post<{ data: { portal_url: string } }>(`/workspaces/${wsId}/billing/portal`);
      if (res.data?.portal_url) window.location.href = res.data.portal_url;
    } catch (e) { console.error(e); } finally { setLoading(null); }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-8 w-32" />
            </div>
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>

        {/* Current Plan Skeleton */}
        <Skeleton className="h-28 w-full rounded-xl" />

        {/* Plan Cards Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                <Skeleton className="h-10 w-24" />
                <div className="space-y-2.5">
                  {[1, 2, 3, 4, 5].map((j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>

        {/* Comparison Table Skeleton */}
        <div className="hidden lg:block space-y-3">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25">
            <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Billing & Plans</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
              Choose the perfect plan for your team. Upgrade or downgrade anytime.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handlePortal}
          disabled={loading === "portal"}
          className="h-10 text-sm font-medium border-border/60 hover:bg-accent hover:text-accent-foreground transition-colors w-full sm:w-auto"
        >
          {loading === "portal" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          <span className="ml-2">Manage Payment</span>
        </Button>
      </div>

      {/* Current Subscription */}
      {subscription && (
        <div className="animate-slide-up" style={{ animationDelay: "0.05s" }}>
          <Card className="relative overflow-hidden border-border/50 bg-gradient-to-r from-card via-card to-card/95">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.03] to-transparent pointer-events-none" />
            <div className="relative p-5 sm:p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                    {(() => {
                      const plan = plans.find(p => p.id === subscription.plan);
                      const IconComponent = plan?.icon || Shield;
                      return <IconComponent className="h-6 w-6 text-primary" />;
                    })()}
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Current Subscription</p>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xl sm:text-2xl font-bold capitalize">{subscription.plan}</h2>
                      <Badge
                        variant={subscription.status === "active" ? "default" : "secondary"}
                        className={cn(
                          "text-xs font-medium px-2.5 py-0.5",
                          subscription.status === "active"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        )}
                      >
                        <span className={cn(
                          "inline-block h-1.5 w-1.5 rounded-full mr-1.5",
                          subscription.status === "active" ? "bg-emerald-500 animate-pulse-subtle" : "bg-amber-500"
                        )} />
                        {subscription.status}
                      </Badge>
                    </div>
                    {subscription.cancel_at_period_end && (
                      <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-400" />
                        Cancels at period end
                      </p>
                    )}
                  </div>
                </div>
                {subscription.current_period_end && (
                  <div className="text-left sm:text-right sm:min-w-[140px]">
                    <p className="text-xs text-muted-foreground">Current period ends</p>
                    <p className="text-sm font-semibold mt-0.5">
                      {new Date(subscription.current_period_end).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Plan Cards Section */}
      <div className="space-y-4 sm:space-y-5">
        <div className="flex items-center gap-2">
          <Separator className="w-8 bg-primary" />
          <h2 className="text-lg sm:text-xl font-semibold">Available Plans</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
          {plans.map((plan, index) => {
            const isCurrent = currentPlan === plan.id;
            const IconComponent = plan.icon || Shield;
            return (
              <div
                key={plan.id}
                className="animate-slide-up"
                style={{ animationDelay: `${0.1 + index * 0.05}s` }}
              >
                <Card
                  className={cn(
                    "relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/[0.08] hover:-translate-y-1",
                    plan.popular
                      ? "border-primary/50 ring-1 ring-primary/20 shadow-md shadow-primary/[0.05]"
                      : "border-border/50",
                    isCurrent && "ring-2 ring-primary/40 border-primary/40"
                  )}
                >
                  {/* Gradient accent for popular plan */}
                  {plan.popular && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-purple-500" />
                  )}

                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white border-0 shadow-md shadow-violet-500/25 hover:from-violet-500 hover:to-indigo-600">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  )}

                  {isCurrent && (
                    <Badge className="absolute top-3 right-3 bg-primary/10 text-primary border-primary/20 text-[10px] font-medium px-2 py-0.5">
                      Current
                    </Badge>
                  )}

                  <CardHeader className="pb-3 p-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10">
                        <IconComponent className="h-5 w-5 text-primary" />
                      </div>
                      {!isCurrent && plan.popular && (
                        <Badge variant="outline" className="text-[10px] font-medium text-primary/70 border-primary/20">
                          Save 20%
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg sm:text-xl mt-3 mb-1">{plan.name}</CardTitle>
                    <p className="text-xs text-muted-foreground leading-relaxed">{plan.description}</p>
                  </CardHeader>

                  <CardContent className="pb-4 px-5 sm:px-6 pt-0">
                    <div className="flex items-baseline gap-1">
                      {plan.price === 0 ? (
                        <span className="text-3xl sm:text-4xl font-bold tracking-tight">Free</span>
                      ) : plan.price === -1 ? (
                        <span className="text-3xl sm:text-4xl font-bold tracking-tight">Custom</span>
                      ) : (
                        <>
                          <span className="text-3xl sm:text-4xl font-bold tracking-tight">${plan.price}</span>
                          <span className="text-sm text-muted-foreground font-medium">/month</span>
                        </>
                      )}
                    </div>

                    <div className="mt-4 sm:mt-5 space-y-2.5">
                      {plan.features.map((f, i) => (
                        <div
                          key={f}
                          className="flex items-center gap-2.5 text-sm group"
                          style={{ animationDelay: `${i * 0.03}s` }}
                        >
                          <div className={cn(
                            "flex h-5 w-5 items-center justify-center rounded-full flex-shrink-0",
                            plan.popular
                              ? "bg-primary/10"
                              : "bg-emerald-500/10"
                          )}>
                            <Check className={cn(
                              "h-3 w-3",
                              plan.popular ? "text-primary" : "text-emerald-500"
                            )} strokeWidth={3} />
                          </div>
                          <span className="text-muted-foreground group-hover:text-foreground transition-colors">{f}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>

                  <CardFooter className="p-5 sm:p-6 pt-0">
                    <Button
                      className={cn(
                        "w-full h-10 text-sm font-medium transition-all duration-200",
                        plan.popular && !isCurrent && "shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
                      )}
                      variant={plan.popular ? "default" : "outline"}
                      disabled={isCurrent || loading === plan.id}
                      onClick={() => handleUpgrade(plan.id)}
                    >
                      {loading === plan.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isCurrent ? (
                        <>
                          <Check className="h-4 w-4 mr-1.5" />
                          Current Plan
                        </>
                      ) : plan.price === -1 ? (
                        <>
                          <Users className="h-4 w-4 mr-1.5" />
                          Contact Sales
                        </>
                      ) : (
                        <>
                          <ArrowRight className="h-4 w-4 mr-1.5" />
                          Upgrade
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* Features Comparison Table - Desktop */}
      <div className="hidden lg:block animate-slide-up" style={{ animationDelay: "0.35s" }}>
        <div className="flex items-center gap-2 mb-4">
          <Separator className="w-8 bg-primary" />
          <h2 className="text-lg sm:text-xl font-semibold">Compare Plans</h2>
        </div>

        <Card className="overflow-hidden border-border/50">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground w-[180px]">Feature</th>
                  {plans.map((plan) => (
                    <th key={plan.id} className={cn(
                      "text-center p-4 text-sm font-semibold",
                      plan.popular ? "text-primary" : "text-foreground"
                    )}>
                      <div className="flex flex-col items-center gap-1">
                        <span className="capitalize">{plan.name}</span>
                        {plan.popular && (
                          <Badge className="text-[10px] bg-primary/10 text-primary border-0 font-medium">Popular</Badge>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allFeatures.map((feature, idx) => (
                  <tr
                    key={feature}
                    className={cn(
                      "border-b border-border/30 last:border-0 transition-colors hover:bg-muted/20",
                      idx % 2 === 0 ? "bg-transparent" : "bg-muted/[0.03]"
                    )}
                  >
                    <td className="p-4 text-sm font-medium text-muted-foreground">{feature}</td>
                  {plans.map((plan) => {
                    const value = getFeatureValue(plan.id)[feature];
                    return (
                      <td key={plan.id} className="text-center p-4 text-sm">
                        {value === "✓" ? (
                          <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10">
                            <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={3} />
                          </div>
                        ) : value === "—" ? (
                          <span className="text-muted-foreground/50">—</span>
                        ) : (
                          <span className="font-medium">{value}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* FAQ / Help Section */}
      <div className="animate-slide-up" style={{ animationDelay: "0.45s" }}>
        <Card className="border-border/50 bg-gradient-to-r from-muted/20 to-transparent">
          <div className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Need help choosing a plan?</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Contact our sales team for a personalized demo and custom pricing.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-sm font-medium flex-shrink-0"
              onClick={() => handleUpgrade("enterprise")}
            >
              <Building2 className="h-3.5 w-3.5 mr-1.5" />
              Talk to Sales
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
