"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores";
import { formatNumber } from "@/lib/utils";
import { toast } from "sonner";
import { AlertTriangle, BarChart3, Filter, RefreshCw } from "lucide-react";

type OverviewData = {
  total_messages: number;
  total_chats: number;
  avg_response_time_ms: number;
  documents_count: number;
  period: string;
};

const METRICS = ["messages", "tokens", "documents"] as const;
type Metric = (typeof METRICS)[number];

export default function AnalyticsPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const wsId = currentWorkspace?.id || "placeholder";
  const [days, setDays] = useState<number>(30);
  const [metric, setMetric] = useState<Metric>("messages");
  const [filter, setFilter] = useState<string>("");

  const { data: overview, isLoading: overviewLoading, isError: overviewError, refetch: refetchOverview } = useQuery({
    queryKey: ["analytics-overview", wsId, days],
    queryFn: async () => {
      try {
        const res = await api.get<{ data: OverviewData }>(`/workspaces/${wsId}/analytics/overview`, { days: String(days) });
        return res.data;
      } catch (e) {
        toast.error("Failed to load analytics overview");
        return { total_messages: 0, total_chats: 0, avg_response_time_ms: 0, documents_count: 0, period: "" };
      }
    },
  });

  const { data: usage, isLoading: usageLoading, isError: usageError, refetch: refetchUsage } = useQuery({
    queryKey: ["analytics-usage", wsId, metric, days],
    queryFn: async () => {
      try {
        const res = await api.get<{ data: Array<{ date: string; value: number }>; metric: string }>(`/workspaces/${wsId}/analytics/usage`, { metric, days: String(days) });
        return res.data || [];
      } catch (e) {
        toast.error("Failed to load usage data");
        return [];
      }
    },
  });

  const usageData = usage || [];

  const statCards = [
    { label: "Messages", value: overview?.total_messages, trend: "+12%" },
    { label: "Chats", value: overview?.total_chats, trend: "+8%" },
    { label: "Documents", value: overview?.documents_count, trend: "+3%" },
    { label: "Avg Response (ms)", value: overview?.avg_response_time_ms, trend: "-5%" },
  ];

  const filteredUsageData = filter
    ? usageData.filter((d) => d.date.toLowerCase().includes(filter.toLowerCase()))
    : usageData;

  if (overviewError && !overview) {
    return (
      <div className="space-y-6 px-4 sm:px-6">
        <ErrorState
          title="Failed to load analytics"
          message="We couldn't load your analytics data. Please try again or contact support."
          onRetry={() => { refetchOverview(); refetchUsage(); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            Analytics
          </h1>
          <p className="text-muted-foreground mt-1">Workspace performance insights</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-full sm:w-[160px] h-9 sm:h-10">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => { refetchOverview(); refetchUsage(); }} className="h-9 sm:h-10">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-normal text-muted-foreground">{s.label}</CardTitle>
              <Badge variant="secondary" className="text-[10px]">{s.trend}</Badge>
            </CardHeader>
            <CardContent>
              {overviewLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-2xl font-bold">{formatNumber(s.value)}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Usage Over Time Chart */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <CardTitle className="text-lg">Usage Over Time</CardTitle>
            <div className="flex items-center gap-2">
            <div className="relative">
              <Filter className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter by date..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-8 h-8 w-full sm:w-[180px] text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="messages" value={metric} onValueChange={(v) => setMetric(v as Metric)}>
            <TabsList>
              <TabsTrigger value="messages">Messages</TabsTrigger>
              <TabsTrigger value="tokens">Tokens</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>
            {METRICS.map((m) => (
              <TabsContent key={m} value={m} className="mt-4">
                {usageLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : usageError ? (
                  <ErrorState
                    title="Failed to load chart"
                    message="Unable to load usage chart data."
                    onRetry={refetchUsage}
                  />
                ) : filteredUsageData.length === 0 ? (
                  <EmptyState
                    icon={<BarChart3 className="h-10 w-10" />}
                    title="No data available"
                    description={`No ${m} data found for the selected period.`}
                    action={{ label: "Refresh", onClick: refetchUsage }}
                  />
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={filteredUsageData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem" }} />
                        <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>Showing {metric} over the last {days} days</span>
          <Badge variant="outline">{filteredUsageData.length} data points</Badge>
        </CardFooter>
      </Card>

      {/* Data Table */}
      {!usageLoading && !usageError && filteredUsageData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detailed Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsageData.slice(0, 10).map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.date}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
