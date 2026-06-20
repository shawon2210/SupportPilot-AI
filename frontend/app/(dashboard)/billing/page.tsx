"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, CreditCard, Loader2, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

const plans = [
  { id: "free", name: "Free", price: 0, features: ["2 team members", "10 documents", "50 messages/day", "100MB storage", "Basic support"] },
  { id: "starter", name: "Starter", price: 29, features: ["5 team members", "100 documents", "500 messages/day", "1GB storage", "Email support", "Custom branding"], popular: true },
  { id: "pro", name: "Pro", price: 99, features: ["25 team members", "1,000 documents", "5,000 messages/day", "10GB storage", "Priority support", "API access", "Analytics"] },
  { id: "enterprise", name: "Enterprise", price: -1, features: ["Unlimited members", "Unlimited documents", "Unlimited messages", "Unlimited storage", "Dedicated support", "SLA guarantee", "Custom integrations"] },
];

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
      <div className="space-y-4 sm:space-y-6 p-2 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 sm:h-8 w-20 sm:w-24" />
            <Skeleton className="h-3 sm:h-4 w-40 sm:w-48" />
          </div>
          <Skeleton className="h-9 sm:h-10 w-full sm:w-36" />
        </div>
        <Skeleton className="h-24 sm:h-28 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-72 sm:h-80 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Billing</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage your subscription and plan</p>
        </div>
        <Button variant="outline" onClick={handlePortal} disabled={loading === "portal"} className="h-9 sm:h-10 text-sm sm:text-base w-full sm:w-auto">
          {loading === "portal" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          <span className="ml-2">Manage Payment</span>
        </Button>
      </div>

      {subscription && (
        <>
          <Card>
            <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
              <CardTitle className="text-sm sm:text-base">Current Subscription</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Current Plan</p>
                  <p className="text-base sm:text-lg font-bold capitalize">{subscription.plan}</p>
                </div>
                <div className="text-left sm:text-right">
                  <Badge variant={subscription.status === "active" ? "default" : "secondary"} className={subscription.status === "active" ? "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20"}>
                    {subscription.status}
                  </Badge>
                  {subscription.cancel_at_period_end && <p className="text-xs text-muted-foreground mt-1">Cancels at period end</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />
        </>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          return (
            <Card key={plan.id} className={cn("relative", plan.popular && "border-primary", isCurrent && "ring-2 ring-primary")}>
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground hover:bg-primary">
                  <Sparkles className="h-3 w-3 mr-1" /> Popular
                </Badge>
              )}
              <CardHeader className="pb-2 p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg">{plan.name}</CardTitle>
              </CardHeader>
              <CardContent className="pb-2 p-3 sm:p-6 pt-0 sm:pt-0">
                <p className="text-xl sm:text-2xl font-bold">
                  {plan.price === 0 ? "Free" : plan.price === -1 ? "Custom" : `$${plan.price}`}
                  <span className="text-xs sm:text-sm font-normal text-muted-foreground">/mo</span>
                </p>
                <ul className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs sm:text-sm">
                      <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="p-3 sm:p-6">
                <Button
                  className="w-full h-9 sm:h-10 text-sm sm:text-base"
                  variant={plan.popular ? "default" : "outline"}
                  disabled={isCurrent || loading === plan.id}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {loading === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isCurrent ? (
                    "Current Plan"
                  ) : plan.price === -1 ? (
                    "Contact Sales"
                  ) : (
                    "Upgrade"
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
