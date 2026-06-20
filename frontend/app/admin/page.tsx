"use client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import {
  Users,
  CreditCard,
  Activity,
  Server,
  RefreshCw,
  Building2,
  UserPlus,
  MessageSquare,
  PieChart,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

type PlatformAnalytics = {
  period_days: number;
  total_workspaces: number;
  total_users: number;
  messages_sent: number;
  plan_distribution: Record<string, number>;
  recent_signups: number;
  active_subscriptions: number;
  total_revenue: number;
};

type StatIcon = ComponentType<LucideProps>;

const fallbackChart = [
  { name: "Jan", value: 0 },
  { name: "Feb", value: 0 },
  { name: "Mar", value: 0 },
  { name: "Apr", value: 0 },
  { name: "May", value: 0 },
  { name: "Jun", value: 0 },
];

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "$0";
  return `$${formatNumber(value)}`;
}

export default function AdminPage() {
  const { data: platform, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["platform-analytics"],
    queryFn: async () => {
      const res = await api.get<{ data: PlatformAnalytics }>("/admin/analytics/platform", { days: "30" });
      return res.data;
    },
  });

  const stats: Array<{ label: string; value: number; icon: StatIcon; color: string; bg: string; prefix?: string }> = [
    { label: "Workspaces", value: platform?.total_workspaces ?? 0, icon: Building2, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Users", value: platform?.total_users ?? 0, icon: Users, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Messages", value: platform?.messages_sent ?? 0, icon: MessageSquare, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { label: "Active Subs", value: platform?.active_subscriptions ?? 0, icon: Activity, color: "text-orange-500", bg: "bg-orange-500/10" },
    { label: "Revenue", value: platform?.total_revenue ?? 0, icon: CreditCard, color: "text-purple-500", bg: "bg-purple-500/10", prefix: "$" },
  ];

  const planRows = Object.entries(platform?.plan_distribution ?? {})
    .sort((a, b) => b[1] - a[1])
    .map(([plan, count]) => ({ plan, count }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <Server className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Admin Panel</h1>
              <p className="text-sm text-muted-foreground sm:text-base">Platform-wide metrics and management</p>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="w-full sm:w-auto">
          <RefreshCw className={isFetching ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
          Refresh
        </Button>
      </div>

      {isError && (
        <ErrorState
          title="Platform admin access required"
          message={(error as ApiError)?.status === 403
            ? "Sign in with a configured platform admin account to view these metrics."
            : (error as Error)?.message || "The admin API could not be reached."}
          onRetry={() => refetch()}
        />
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="min-w-0">
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${s.bg}`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="truncate text-2xl font-bold tracking-tight">
                  {s.prefix === "$" ? formatCurrency(s.value) : formatNumber(s.value)}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Platform activity</CardTitle>
              <p className="text-sm text-muted-foreground">Last {platform?.period_days ?? 30} days</p>
            </div>
            <Badge variant="outline" className="w-fit">
              {platform ? "Live" : "Loading"}
            </Badge>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <div className="h-72 min-h-[18rem]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fallbackChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--accent))" }}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem" }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>Showing platform activity overview</span>
            <span>{platform ? `${formatNumber(platform.total_workspaces)} workspaces tracked` : "Waiting for backend data"}</span>
          </CardFooter>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Plan distribution</CardTitle>
              <p className="text-sm text-muted-foreground">Workspaces by plan</p>
            </div>
            <PieChart className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : planRows.length === 0 ? (
              <EmptyState
                icon={<Building2 className="h-10 w-10" />}
                title="No workspaces yet"
                description="Workspaces will appear here once users sign up and create their first workspace."
                action={{ label: "Refresh", onClick: () => refetch() }}
              />
            ) : (
              <div className="space-y-3">
                {planRows.map((row) => (
                  <div key={row.plan} className="flex items-center justify-between gap-3 rounded-md border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium capitalize">{row.plan}</p>
                      <p className="text-xs text-muted-foreground">Plan tier</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">{formatNumber(row.count)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Platform summary</CardTitle>
            <p className="text-sm text-muted-foreground">Recent signups and subscription signals</p>
          </div>
          <Badge variant="outline" className="w-fit">Admin only</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : platform?.total_workspaces === 0 ? (
            <EmptyState
              icon={<UserPlus className="h-12 w-12" />}
              title="No signups yet"
              description="User and workspace activity will appear here as customers create accounts."
              action={{ label: "Refresh", onClick: () => refetch() }}
              className="m-6"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Recent signups</TableCell>
                  <TableCell className="text-right">{formatNumber(platform?.recent_signups)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Active subscriptions</TableCell>
                  <TableCell className="text-right">{formatNumber(platform?.active_subscriptions)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Total revenue</TableCell>
                  <TableCell className="text-right">{formatCurrency(platform?.total_revenue)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Messages sent</TableCell>
                  <TableCell className="text-right">{formatNumber(platform?.messages_sent)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
