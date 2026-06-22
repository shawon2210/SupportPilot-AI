"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { MessageSquare, FileText, Users, Zap, TrendingUp, AlertTriangle, BarChart3, Clock, RefreshCw, Check } from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores";
import { formatNumber, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/shared/page-transition";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const statCards = [
  { label: "Total Messages", icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-500/10", cardClass: "stat-card-blue hover:border-blue-500/35", key: "total_messages" },
  { label: "Total Chats", icon: Users, color: "text-green-500", bg: "bg-green-500/10", cardClass: "stat-card-green hover:border-emerald-500/35", key: "total_chats" },
  { label: "Documents", icon: FileText, color: "text-purple-500", bg: "bg-purple-500/10", cardClass: "stat-card-purple hover:border-purple-500/35", key: "documents_count" },
  { label: "Avg Response", icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10", cardClass: "stat-card-orange hover:border-orange-500/35", key: "avg_response_time_ms" },
];

const quickActions = [
  { href: "/knowledge/upload", icon: FileText, label: "Upload Document", desc: "Add to knowledge base" },
  { href: "/chat", icon: MessageSquare, label: "New Chat", desc: "Start a conversation" },
  { href: "/widget", icon: Zap, label: "Configure Widget", desc: "Customize your widget" },
  { href: "/team", icon: Users, label: "Invite Team", desc: "Add team members" },
];

type ActivityItem = { id: string; type: string; message: string; time: string };

export default function DashboardPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [showChecklist, setShowChecklist] = useState(false);
  const [teamInvited, setTeamInvited] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hideChecklist = localStorage.getItem("hide_onboarding") === "true";
      setShowChecklist(!hideChecklist);
      setTeamInvited(localStorage.getItem("team_invited") === "true");
    }
  }, []);

  const handleInviteTeam = () => {
    localStorage.setItem("team_invited", "true");
    setTeamInvited(true);
    toast.success("Mock invitation emails sent to support team members!");
  };

  const wsId = currentWorkspace?.id;
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      try {
        const res = await api.get<{ data: Record<string, number> }>(`/workspaces/${wsId}/analytics/overview`);
        return res.data || {};
      } catch {
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
      <div className="space-y-4 sm:space-y-6">
        <ErrorState
          title="Failed to load dashboard"
          message="We couldn't load your dashboard. Please try again."
          onRetry={refetch}
        />
      </div>
    );
  }

  const hasDocs = (stats.documents_count ?? 0) > 0;
  const hasChats = (stats.total_chats ?? 0) > 0;

  let progress = 25;
  if (hasDocs) progress += 25;
  if (hasChats) progress += 25;
  if (teamInvited) progress += 25;

  return (
    <PageTransition className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="heading-1 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-primary flex-shrink-0" />
            <span className="truncate">Dashboard</span>
          </h1>
          <p className="body-sm mt-1 truncate">Overview of your AI support workspace</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="shrink-0">
          <RefreshCw className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Onboarding Checklist Widget */}
      {showChecklist && (
        <Card className="border-primary/25 bg-gradient-to-br from-primary/5 via-transparent to-transparent shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/20 text-primary border-primary/25 hover:bg-primary/20">Setup Guide</Badge>
                  <h2 className="heading-2">Get started with SupportPilot AI</h2>
                </div>
                <p className="body-sm">Complete these quick steps to train your AI support agent and launch it on your website.</p>
                <div className="flex items-center gap-3 pt-2">
                  <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-primary whitespace-nowrap">{progress}% Complete</span>
                </div>
              </div>
              <button 
                onClick={() => { setShowChecklist(false); localStorage.setItem("hide_onboarding", "true"); }}
                className="text-xs text-muted-foreground hover:text-foreground shrink-0 font-semibold md:self-start transition-colors"
              >
                Dismiss
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5">
              {/* Step 1 */}
              <div className="rounded-xl border border-border/50 bg-background/45 p-3.5 flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center shrink-0 mt-0.5 border border-green-500/20">
                  <Check className="h-3 w-3" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold">Create workspace</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Setup support pilot profile</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="rounded-xl border border-border/50 bg-background/45 p-3.5 flex items-start gap-3">
                <div className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border",
                  hasDocs 
                    ? "bg-green-500/10 text-green-500 border-green-500/20" 
                    : "bg-muted text-muted-foreground border-border"
                )}>
                  {hasDocs ? <Check className="h-3 w-3" /> : <span className="text-[10px] font-bold">2</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold">Train AI model</p>
                  {hasDocs ? (
                    <p className="text-[10px] text-green-500 mt-0.5 flex items-center gap-0.5"><Check className="h-2.5 w-2.5" /> AI Trained</p>
                  ) : (
                    <Link href="/knowledge" className="text-[10px] text-primary hover:underline font-semibold block mt-0.5">Upload docs &rarr;</Link>
                  )}
                </div>
              </div>

              {/* Step 3 */}
              <div className="rounded-xl border border-border/50 bg-background/45 p-3.5 flex items-start gap-3">
                <div className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border",
                  hasChats 
                    ? "bg-green-500/10 text-green-500 border-green-500/20" 
                    : "bg-muted text-muted-foreground border-border"
                )}>
                  {hasChats ? <Check className="h-3 w-3" /> : <span className="text-[10px] font-bold">3</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold">Test AI chat widget</p>
                  {hasChats ? (
                    <p className="text-[10px] text-green-500 mt-0.5 flex items-center gap-0.5"><Check className="h-2.5 w-2.5" /> Widget tested</p>
                  ) : (
                    <Link href="/chat" className="text-[10px] text-primary hover:underline font-semibold block mt-0.5">Start simulator &rarr;</Link>
                  )}
                </div>
              </div>

              {/* Step 4 */}
              <div className="rounded-xl border border-border/50 bg-background/45 p-3.5 flex items-start gap-3">
                <div className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border",
                  teamInvited 
                    ? "bg-green-500/10 text-green-500 border-green-500/20" 
                    : "bg-muted text-muted-foreground border-border"
                )}>
                  {teamInvited ? <Check className="h-3 w-3" /> : <span className="text-[10px] font-bold">4</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold">Invite your team</p>
                  {teamInvited ? (
                    <p className="text-[10px] text-green-500 mt-0.5 flex items-center gap-0.5"><Check className="h-2.5 w-2.5" /> Team invited</p>
                  ) : (
                    <button onClick={handleInviteTeam} className="text-[10px] text-primary hover:underline font-semibold block mt-0.5 text-left">Send invites &rarr;</button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <StaggerContainer className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {statCards.map((card) => (
          <StaggerItem key={card.key}>
            <Card className={cn("min-w-0 transition-all duration-300 card-hover card-glow hover:-translate-y-0.5", card.cardClass)}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 p-3 sm:p-4">
              <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">{card.label}</CardTitle>
              <div className={`p-1.5 sm:p-2 rounded-md ${card.bg} shrink-0`}>
                <card.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              {isLoading ? (
                <Skeleton className="h-5 w-12 sm:h-8 sm:w-16" />
              ) : (
                <div className="flex items-baseline gap-1 sm:gap-2">
                  <p className="text-lg sm:text-2xl font-bold truncate">{formatNumber(stats[card.key])}</p>
                  <Badge variant="secondary" className="text-[8px] sm:text-[10px] hidden sm:inline-flex">
                    <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" />
                    Live
                  </Badge>
                </div>
              )}
            </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerContainer>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 p-3 sm:p-4">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Input
              placeholder="Search activity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full sm:w-[180px] text-sm"
            />
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-3 sm:p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-2 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredActivity.length === 0 ? (
              <EmptyState
                icon={<AlertTriangle className="h-8 w-8 sm:h-10 sm:w-10" />}
                title="No activity found"
                description={
                  searchQuery
                    ? `No activity matches "${searchQuery}"`
                    : "No recent activity to display"
                }
                action={searchQuery ? { label: "Clear search", onClick: () => setSearchQuery("") } : undefined}
              />
            ) : (
              <>
                <div className="sm:hidden divide-y divide-border">
                  {filteredActivity.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 p-3">
                      <Badge variant="outline" className="text-[9px] capitalize flex-shrink-0 px-1.5 py-0.5">{item.type}</Badge>
                      <span className="text-xs truncate flex-1 min-w-0">{item.message}</span>
                      <span className="text-[9px] text-muted-foreground whitespace-nowrap flex-shrink-0">{item.time}</span>
                    </div>
                  ))}
                </div>

                <div className="hidden sm:block overflow-x-auto">
                  <Table className="min-w-[400px]">
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
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 sm:p-4">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex flex-col gap-1 p-3 sm:p-4 rounded-lg border border-border bg-background/50 hover:bg-accent hover:border-primary/40 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-sm hover:shadow-md group min-w-0"
                >
                  <div className="flex items-center gap-2">
                    <action.icon className="h-4 w-4 text-primary group-hover:scale-110 transition-transform duration-200 shrink-0" />
                    <span className="text-xs sm:text-sm font-semibold truncate group-hover:text-primary transition-colors">{action.label}</span>
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground truncate">{action.desc}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
