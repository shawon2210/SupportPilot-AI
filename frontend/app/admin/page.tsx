"use client";

import { useQuery } from "@tanstack/react-query";
import type { ComponentType } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "@/components/charts/dynamic-recharts";
import {
  Users, CreditCard, Activity, Server, RefreshCw, Building2,
  UserPlus, MessageSquare, PieChart, TrendingUp, DollarSign, Shield
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

type StatIcon = ComponentType<{ className?: string }>;

const fallbackChart = [
  { name: "Jan", value: 0 }, { name: "Feb", value: 0 }, { name: "Mar", value: 0 },
  { name: "Apr", value: 0 }, { name: "May", value: 0 }, { name: "Jun", value: 0 },
];

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "$0";
  return `$${formatNumber(value)}`;
}

const PLAN_COLORS: Record<string, string> = {
  free: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  starter: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  pro: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  enterprise: "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

export default function AdminPage() {
  const { data: platform, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["platform-analytics"],
    queryFn: async () => {
      const res = await api.get<{ data: PlatformAnalytics }>("/admin/analytics/platform", { days: "30" });
      return res.data;
    },
  });

  const stats: Array<{ label: string; value: number; icon: StatIcon; gradient: string; iconColor: string; prefix?: string }> = [
    { label: "Workspaces", value: platform?.total_workspaces ?? 0, icon: Building2, gradient: "stat-card-blue", iconColor: "text-blue-500" },
    { label: "Users", value: platform?.total_users ?? 0, icon: Users, gradient: "stat-card-green", iconColor: "text-emerald-500" },
    { label: "Messages", value: platform?.messages_sent ?? 0, icon: MessageSquare, gradient: "stat-card-purple", iconColor: "text-purple-500" },
    { label: "Active Subs", value: platform?.active_subscriptions ?? 0, icon: Activity, gradient: "stat-card-orange", iconColor: "text-orange-500" },
    { label: "Revenue", value: platform?.total_revenue ?? 0, icon: DollarSign, gradient: "stat-card-cyan", iconColor: "text-cyan-500", prefix: "$" },
  ];

  const planRows = Object.entries(platform?.plan_distribution ?? {})
    .sort((a, b) => b[1] - a[1])
    .map(([plan, count]) => ({ plan, count }));

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-sm">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Admin Panel</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Platform-wide metrics and management</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="h-9 w-full sm:w-auto">
          <RefreshCw className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")} />
          <span className="hidden sm:inline">Refresh</span>
          <span className="sm:hidden">Refresh data</span>
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

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        {stats.map((s) => (
          <Card key={s.label} className={`${s.gradient} border card-hover`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
              <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">{s.label}</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-background/60 flex items-center justify-center flex-shrink-0">
                <s.icon className={`h-4 w-4 ${s.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0">
              {isLoading ? (
                <Skeleton className="h-6 w-16 sm:h-8 sm:w-20" />
              ) : (
                <p className="text-lg sm:text-2xl font-bold tracking-tight truncate">
                  {s.prefix === "$" ? formatCurrency(s.value) : formatNumber(s.value)}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Chart */}
        <Card className="xl:col-span-2">
          <CardHeader className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Platform Activity
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Last {platform?.period_days ?? 30} days</p>
              </div>
              <Badge variant="outline" className="text-[10px] h-6">
                {platform ? "● Live" : "○ Loading"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
            {isLoading ? (
              <Skeleton className="h-48 sm:h-64 w-full" />
            ) : (
              <div className="h-48 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fallbackChart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--accent) / 0.3)" }}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
          <CardFooter className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0 flex flex-col gap-1 text-[10px] sm:text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between border-t border-border">
            <span>Platform activity overview</span>
            <span>{platform ? `${formatNumber(platform.total_workspaces)} workspaces tracked` : "Waiting for data"}</span>
          </CardFooter>
        </Card>

        {/* Plan Distribution */}
        <Card>
          <CardHeader className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-primary" />
                  Plan Distribution
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Workspaces by plan</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : planRows.length === 0 ? (
              <EmptyState
                icon={<Building2 className="h-8 w-8" />}
                title="No workspaces yet"
                description="Workspaces will appear here once users sign up."
                action={{ label: "Refresh", onClick: () => refetch() }}
              />
            ) : (
              <div className="space-y-2">
                {planRows.map((row) => {
                  const total = planRows.reduce((sum, r) => sum + r.count, 0);
                  const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
                  return (
                    <div key={row.plan} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] capitalize ${PLAN_COLORS[row.plan] || ""}`}>
                            {row.plan}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        </div>
                        <span className="text-xs font-semibold">{formatNumber(row.count)}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Platform Summary Table */}
      <Card>
        <CardHeader className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold">Platform Summary</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Recent signups and subscription signals</p>
            </div>
            <Badge variant="outline" className="text-[10px] h-6 bg-red-500/10 text-red-500 border-red-500/20">
              <Shield className="h-3 w-3 mr-1" />
              Admin only
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4 sm:p-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : platform?.total_workspaces === 0 ? (
            <EmptyState
              icon={<UserPlus className="h-10 w-10" />}
              title="No signups yet"
              description="User and workspace activity will appear here as customers create accounts."
              action={{ label: "Refresh", onClick: () => refetch() }}
              className="m-4 sm:m-6"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[350px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Metric</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-sm">Recent signups</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{formatNumber(platform?.recent_signups)}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-sm">Active subscriptions</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{formatNumber(platform?.active_subscriptions)}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-sm">Total revenue</TableCell>
                    <TableCell className="text-right text-sm tabular-nums font-semibold text-emerald-500">{formatCurrency(platform?.total_revenue)}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-sm">Messages sent</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{formatNumber(platform?.messages_sent)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
