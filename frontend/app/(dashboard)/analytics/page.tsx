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
import { BarChart3, Filter, RefreshCw } from "lucide-react";

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
      <div className="space-y-4 sm:space-y-6">
        <ErrorState
          title="Failed to load analytics"
          message="We could not load your analytics data. Please try again or contact support."
          onRetry={() => { refetchOverview(); refetchUsage(); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-primary shrink-0" />
            <span className="truncate">Analytics</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">Workspace performance insights</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-full sm:w-[140px] h-9">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => { refetchOverview(); refetchUsage(); }} className="h-9">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="min-w-0">
            <CardHeader className="pb-1 sm:pb-2 flex flex-row items-center justify-between p-3 sm:p-4">
              <CardTitle className="text-[10px] sm:text-xs font-normal text-muted-foreground truncate">{s.label}</CardTitle>
              <Badge variant="secondary" className="text-[8px] sm:text-[10px] shrink-0">{s.trend}</Badge>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              {overviewLoading ? (
                <Skeleton className="h-5 w-16 sm:h-8 sm:w-20" />
              ) : (
                <p className="text-lg sm:text-2xl font-bold truncate">{formatNumber(s.value)}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-3 sm:p-4">
          <CardTitle className="text-base sm:text-lg">Usage Over Time</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-initial">
              <Filter className="h-3 w-3 sm:h-3.5 sm:w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Filter date..." value={filter} onChange={(e) => setFilter(e.target.value)} className="pl-7 sm:pl-8 h-8 w-full sm:w-[160px] text-xs sm:text-sm" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          <Tabs defaultValue="messages" value={metric} onValueChange={(v) => setMetric(v as Metric)}>
            <TabsList className="h-8 sm:h-9">
              <TabsTrigger value="messages" className="text-xs sm:text-sm">Messages</TabsTrigger>
              <TabsTrigger value="tokens" className="text-xs sm:text-sm">Tokens</TabsTrigger>
              <TabsTrigger value="documents" className="text-xs sm:text-sm">Documents</TabsTrigger>
            </TabsList>
            {METRICS.map((m) => (
              <TabsContent key={m} value={m} className="mt-3 sm:mt-4">
                {usageLoading ? (
                  <Skeleton className="h-48 sm:h-64 w-full" />
                ) : usageError ? (
                  <ErrorState title="Failed to load chart" message="Unable to load usage chart data." onRetry={refetchUsage} />
                ) : filteredUsageData.length === 0 ? (
                  <EmptyState icon={<BarChart3 className="h-8 w-8 sm:h-10 sm:w-10" />} title="No data available" description={`No ${m} data found for the selected period.`} action={{ label: "Refresh", onClick: () => refetchUsage() }} />
                ) : (
                  <div className="h-48 sm:h-64 min-h-[12rem]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={filteredUsageData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", fontSize: 12 }} />
                        <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
        <CardFooter className="text-[10px] sm:text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 p-3 sm:p-4 pt-0">
          <span>Showing {metric} over {days} days</span>
          <Badge variant="outline">{filteredUsageData.length} points</Badge>
        </CardFooter>
      </Card>

      {!usageLoading && !usageError && filteredUsageData.length > 0 && (
        <Card>
          <CardHeader className="p-3 sm:p-4">
            <CardTitle className="text-sm sm:text-base">Detailed Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[400px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs whitespace-nowrap">Date</TableHead>
                    <TableHead className="text-right text-xs whitespace-nowrap">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsageData.slice(0, 10).map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">{row.date}</TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">{formatNumber(row.value)}</TableCell>
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
