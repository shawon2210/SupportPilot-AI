"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { MessageSquare, FileText, Users, Zap, TrendingUp, AlertTriangle, BarChart3, Clock, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { toast } from "sonner";
import { useState } from "react";

const statCards = [
  { label: "Total Messages", icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-500/10", key: "total_messages" },
  { label: "Total Chats", icon: Users, color: "text-green-500", bg: "bg-green-500/10", key: "total_chats" },
  { label: "Documents", icon: FileText, color: "text-purple-500", bg: "bg-purple-500/10", key: "documents_count" },
  { label: "Avg Response", icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10", key: "avg_response_time_ms" },
];

const quickActions = [
  { href: "/knowledge/upload", icon: FileText, label: "Upload Document", desc: "Add to knowledge base" },
  { href: "/chat", icon: MessageSquare, label: "New Chat", desc: "Start a conversation" },
  { href: "/widget", icon: Zap, label: "Configure Widget", desc: "Customize your widget" },
  { href: "/team", icon: Users, label: "Invite Team", desc: "Add team members" },
];

type ActivityItem = { id: string; type: string; message: string; time: string };

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      try {
        const res = await api.get<{ data: Record<string, number> }>("/workspaces/placeholder/analytics/overview");
        return res.data || {};
      } catch (e) {
        toast.error("Failed to load dashboard data");
        return { total_messages: 0, total_chats: 0, documents_count: 0, avg_response_time_ms: 0 };
      }
    },
  });

  const stats = data || {};

  const recentActivity: ActivityItem[] = [
    { id: "1", type: "chat", message: "New conversation started", time: "2 min ago" },
    { id: "2", type: "doc", message: "Document uploaded: FAQ.pdf", time: "15 min ago" },
    { id: "3", type: "team", message: "New member joined", time: "1 hour ago" },
    { id: "4", type: "chat", message: "Conversation resolved", time: "2 hours ago" },
    { id: "5", type: "doc", message: "Knowledge base updated", time: "3 hours ago" },
  ];

  const filteredActivity = searchQuery
    ? recentActivity.filter((a) => a.message.toLowerCase().includes(searchQuery.toLowerCase()))
    : recentActivity;

  if (isError && !data) {
    return (
      <div className="space-y-6 px-4 sm:px-6">
        <ErrorState
          title="Failed to load dashboard"
          message="We couldn't load your dashboard. Please try again."
          onRetry={refetch}
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
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Overview of your AI support workspace</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.key}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{card.label}</CardTitle>
              <div className={`p-2 rounded-md ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">{formatNumber(stats[card.key])}</p>
                  <Badge variant="secondary" className="text-[10px]">
                    <TrendingUp className="h-3 w-3 mr-0.5" />
                    Live
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <div className="relative">
              <Input
                placeholder="Search activity..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full sm:w-[180px] text-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-2 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredActivity.length === 0 ? (
              <EmptyState
                icon={<AlertTriangle className="h-10 w-10" />}
                title="No activity found"
                description={
                  searchQuery
                    ? `No activity matches "${searchQuery}"`
                    : "No recent activity to display"
                }
                action={searchQuery ? { label: "Clear search", onClick: () => setSearchQuery("") } : undefined}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivity.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] capitalize">{item.type}</Badge>
                          <span className="text-sm truncate">{item.message}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">{item.time}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex flex-col gap-1 p-4 rounded-md border border-border hover:bg-accent hover:border-primary/50 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <action.icon className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">{action.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{action.desc}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
