"use client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, CreditCard, Activity, Server, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";

export default function AdminPage() {
  const { data: platform, isLoading, error, refetch } = useQuery({
    queryKey: ["platform-analytics"],
    queryFn: async () => {
      try {
        const res = await api.get<{ data: { total_workspaces: number; total_users: number; total_revenue: number; active_subscriptions: number } }>("/admin/analytics/platform");
        return res.data;
      } catch (err) {
        toast.error("Failed to load platform analytics");
        return { total_workspaces: 0, total_users: 0, total_revenue: 0, active_subscriptions: 0 };
      }
    },
  });

  const stats: Array<{ label: string; value: number; icon: typeof Server; color: string; bg: string }> = [
    { label: "Workspaces", value: platform?.total_workspaces ?? 0, icon: Server, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Users", value: platform?.total_users ?? 0, icon: Users, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Revenue", value: platform?.total_revenue ?? 0, icon: CreditCard, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Active Subs", value: platform?.active_subscriptions ?? 0, icon: Activity, color: "text-orange-500", bg: "bg-orange-500/10" },
  ];

  const chartData = [
    { name: "Jan", value: 400 }, { name: "Feb", value: 600 }, { name: "Mar", value: 800 },
    { name: "Apr", value: 1200 }, { name: "May", value: 1600 }, { name: "Jun", value: 2000 },
  ];

  if (!isLoading && platform?.total_workspaces === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Platform-wide metrics and management</p>
        </div>
        <EmptyState
          icon={<Server className="h-12 w-12" />}
          title="No workspaces yet"
          description="Workspaces will appear here once users sign up and create their first workspace."
          action={{ label: "Refresh", onClick: () => refetch() }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">Platform-wide metrics and management</p>
      </div>

      {error && (
        <ErrorState
          title="Failed to load analytics"
          message={(error as Error)?.message || "Could not load platform analytics."}
          onRetry={() => refetch()}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <div className={`p-2 rounded-md ${s.bg}`}><s.icon className={`h-4 w-4 ${s.color}`} /></div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold">{s.label === "Revenue" ? `$${formatNumber(s.value)}` : formatNumber(s.value)}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem" }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
