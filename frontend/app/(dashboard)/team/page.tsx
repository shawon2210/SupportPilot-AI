"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Users, Mail, Shield, UserCog, Crown, CheckCircle2, XCircle, Sparkles, Send } from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores";
import { cn, formatDate, getRoleBadgeColor, getInitials } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { toast } from "sonner";

const ROLE_CONFIG: Record<string, { label: string; description: string; icon: React.ElementType; color: string }> = {
  owner: { label: "Owner", description: "Full access to all settings and billing", icon: Crown, color: "text-purple-400" },
  admin: { label: "Admin", description: "Manage members, settings, and integrations", icon: Shield, color: "text-blue-400" },
  agent: { label: "Agent", description: "Handle tickets and interact with customers", icon: UserCog, color: "text-green-400" },
  member: { label: "Member", description: "View tickets and basic workspace access", icon: Users, color: "text-gray-400" },
};

function AnimatedCount({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const start = display;
    const diff = value - start;
    if (diff === 0) return;
    const duration = 400;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    }

    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span>{display}</span>;
}

export default function TeamPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const wsId = currentWorkspace?.id || "placeholder";
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  const { data: members, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["members", wsId],
    queryFn: async () => {
      try {
        const res = await api.get<{ data: Array<{ id: string; user_id: string; role: string; is_active: boolean; joined_at: string | null; user_email: string | null; user_name: string | null }> }>(`/workspaces/${wsId}/members`);
        return res.data || [];
      } catch (e) {
        toast.error("Failed to load team members");
        throw e;
      }
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async () => api.post(`/workspaces/${wsId}/members`, { email: inviteEmail, role: inviteRole }),
    onSuccess: () => { toast.success("Member invited"); setShowInvite(false); setInviteEmail(""); refetch(); },
    onError: () => toast.error("Failed to invite member"),
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) =>
      api.patch(`/workspaces/${wsId}/members/${memberId}`, { role }),
    onSuccess: () => refetch(),
  });

  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => api.delete(`/workspaces/${wsId}/members/${memberId}`),
    onSuccess: () => refetch(),
  });

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <ErrorState
          title="Failed to load team"
          message={(error as Error)?.message || "An unexpected error occurred"}
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 sm:space-y-6 px-3 sm:px-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-primary/80 to-primary/40 flex items-center justify-center shadow-lg shadow-primary/10">
            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Team</h1>
              {!isLoading && (
                <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tabular-nums">
                  <AnimatedCount value={members?.length || 0} />
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Manage your workspace members and their permissions
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowInvite(true)}
          className="h-9 sm:h-10 text-sm sm:text-base w-full sm:w-auto active:scale-95 transition-transform"
        >
          <Plus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] sm:mx-auto animate-scale-in">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <DialogTitle className="text-lg sm:text-xl">Invite New Member</DialogTitle>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Send an invitation to join your workspace
            </p>
          </DialogHeader>
          <div className="space-y-4 py-3 sm:py-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5">Email Address</label>
              <Input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                type="email"
                className="h-10 text-sm sm:text-base"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && inviteEmail && !inviteMutation.isPending) {
                    inviteMutation.mutate();
                  }
                }}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5">Role</label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="h-10 text-sm sm:text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_CONFIG).map(([value, config]) => {
                    const Icon = config.icon;
                    return (
                      <SelectItem key={value} value={value} className="py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Icon className={cn("h-4 w-4", config.color)} />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{config.label}</span>
                            <span className="text-[11px] text-muted-foreground">{config.description}</span>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1.5 pl-1">
                {ROLE_CONFIG[inviteRole]?.description}
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setShowInvite(false)}
              className="w-full sm:w-auto h-10 text-sm sm:text-base active:scale-95 transition-transform"
            >
              Cancel
            </Button>
            <Button
              onClick={() => inviteMutation.mutate()}
              disabled={!inviteEmail || inviteMutation.isPending}
              className="w-full sm:w-auto h-10 text-sm sm:text-base active:scale-95 transition-transform"
            >
              {inviteMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Sending...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="h-3.5 w-3.5" />
                  Send Invite
                </span>
              )}
            </Button>
          </DialogFooter>
          <p className="text-[11px] text-muted-foreground text-center -mt-1">
            Press <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Enter</kbd> to send
          </p>
        </DialogContent>
      </Dialog>

      {/* Loading */}
      {isLoading ? (
        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (members || []).length === 0 ? (
        <EmptyState
          icon={
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                <Users className="h-8 w-8 text-primary/60" />
              </div>
              <Sparkles className="h-4 w-4 text-primary absolute -top-1 -right-1 animate-pulse-subtle" />
            </div>
          }
          title="No team members yet"
          description="Your workspace is empty. Invite your first team member to start collaborating and managing support tickets together."
          action={{
            label: "Invite Your First Member",
            onClick: () => setShowInvite(true),
          }}
          className="py-16 sm:py-20"
        />
      ) : (
        <>
          {/* Mobile: Card layout */}
          <div className="sm:hidden space-y-2.5">
            {(members || []).map((m, idx) => {
              const roleConfig = ROLE_CONFIG[m.role] || ROLE_CONFIG.member;
              const RoleIcon = roleConfig.icon;
              return (
                <Card
                  key={m.id}
                  className="card-hover active:scale-[0.98] transition-all duration-200"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <CardContent className="p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-10 w-10 ring-2 ring-border">
                          <AvatarFallback className={cn(
                            "text-sm font-semibold bg-gradient-to-br",
                            m.role === "owner" ? "from-purple-500/20 to-purple-600/20 text-purple-400" :
                            m.role === "admin" ? "from-blue-500/20 to-blue-600/20 text-blue-400" :
                            m.role === "agent" ? "from-green-500/20 to-green-600/20 text-green-400" :
                            "from-gray-500/20 to-gray-600/20 text-gray-400"
                          )}>
                            {getInitials(m.user_name || m.user_email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card",
                          m.is_active ? "bg-emerald-500" : "bg-gray-400"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate">{m.user_name || m.user_email}</p>
                          {m.is_active ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{m.user_email}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px] font-medium px-1.5 py-0 h-5 gap-1 border",
                              getRoleBadgeColor(m.role)
                            )}
                          >
                            <RoleIcon className="h-2.5 w-2.5" />
                            {roleConfig.label}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{formatDate(m.joined_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Select value={m.role} onValueChange={(role) => updateRoleMutation.mutate({ memberId: m.id, role })}>
                          <SelectTrigger className="h-7 w-7 p-0 text-xs border-0 bg-transparent hover:bg-muted/50">
                            <svg className="h-3.5 w-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ROLE_CONFIG).map(([value, config]) => {
                              const Icon = config.icon;
                              return (
                                <SelectItem key={value} value={value}>
                                  <div className="flex items-center gap-2">
                                    <Icon className={cn("h-3.5 w-3.5", config.color)} />
                                    <span className="text-sm">{config.label}</span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMutation.mutate(m.id)}
                          className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-95 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Desktop: Table layout */}
          <div className="hidden sm:block">
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b-border/50">
                    <TableHead className="pl-5 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Member</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Role</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Joined</TableHead>
                    <TableHead className="w-20 pr-5" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(members || []).map((m, idx) => {
                    const roleConfig = ROLE_CONFIG[m.role] || ROLE_CONFIG.member;
                    const RoleIcon = roleConfig.icon;
                    return (
                      <TableRow
                        key={m.id}
                        className="group transition-colors hover:bg-muted/30 animate-fade-in"
                        style={{ animationDelay: `${idx * 40}ms` }}
                      >
                        <TableCell className="pl-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="h-9 w-9 ring-1 ring-border">
                                <AvatarFallback className={cn(
                                  "text-xs font-semibold bg-gradient-to-br",
                                  m.role === "owner" ? "from-purple-500/20 to-purple-600/20 text-purple-400" :
                                  m.role === "admin" ? "from-blue-500/20 to-blue-600/20 text-blue-400" :
                                  m.role === "agent" ? "from-green-500/20 to-green-600/20 text-green-400" :
                                  "from-gray-500/20 to-gray-600/20 text-gray-400"
                                )}>
                                  {getInitials(m.user_name || m.user_email)}
                                </AvatarFallback>
                              </Avatar>
                              <div className={cn(
                                "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
                                m.is_active ? "bg-emerald-500" : "bg-gray-400"
                              )} />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{m.user_name || m.user_email}</p>
                              {m.user_email && (
                                <p className="text-xs text-muted-foreground">{m.user_email}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          {m.is_active ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-500">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-subtle" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                              Inactive
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-3.5">
                          <Select value={m.role} onValueChange={(role) => updateRoleMutation.mutate({ memberId: m.id, role })}>
                            <SelectTrigger className={cn(
                              "w-32 text-xs font-medium h-8 gap-1.5 border",
                              getRoleBadgeColor(m.role)
                            )}>
                              <RoleIcon className="h-3 w-3" />
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(ROLE_CONFIG).map(([value, config]) => {
                                const Icon = config.icon;
                                return (
                                  <SelectItem key={value} value={value}>
                                    <div className="flex items-center gap-2.5">
                                      <Icon className={cn("h-3.5 w-3.5", config.color)} />
                                      <div className="flex flex-col">
                                        <span className="text-sm font-medium">{config.label}</span>
                                        <span className="text-[11px] text-muted-foreground">{config.description}</span>
                                      </div>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-3.5 text-sm text-muted-foreground tabular-nums">
                          {formatDate(m.joined_at)}
                        </TableCell>
                        <TableCell className="pr-5 py-3.5">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeMutation.mutate(m.id)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-95 transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
