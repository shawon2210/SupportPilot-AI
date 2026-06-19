"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Users } from "lucide-react";
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

  return (
    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6 p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Team</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{members?.length || 0} members in this workspace</p>
        </div>
        <Button onClick={() => setShowInvite(true)} className="h-9 sm:h-10 text-sm sm:text-base w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />Invite Member
        </Button>
      </div>

      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-sm sm:max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Invite New Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-1.5">Email</label>
              <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@company.com" type="email" className="h-9 sm:h-10 text-sm sm:text-base" />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-1.5">Role</label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="h-9 sm:h-10 text-sm sm:text-base"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowInvite(false)} className="w-full sm:w-auto h-9 sm:h-10 text-sm sm:text-base">Cancel</Button>
            <Button onClick={() => inviteMutation.mutate()} disabled={!inviteEmail || inviteMutation.isPending} className="w-full sm:w-auto h-9 sm:h-10 text-sm sm:text-base">
              {inviteMutation.isPending ? "Sending..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <Card>
          <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 sm:h-16 w-full" />)}
          </CardContent>
        </Card>
      ) : (members || []).length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10 sm:h-12 sm:w-12" />}
          title="No team members"
          description="Invite your first team member to collaborate"
          action={{ label: "Invite Member", onClick: () => setShowInvite(true) }}
        />
      ) : (
        <Card className="overflow-x-auto">
          <div className="min-w-[500px] sm:min-w-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Member</TableHead>
                  <TableHead className="text-xs sm:text-sm">Role</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Joined</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(members || []).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                          <AvatarFallback className="text-xs">{getInitials(m.user_name || m.user_email)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs sm:text-sm font-medium">{m.user_name || m.user_email}</p>
                          {m.user_email && <p className="text-xs text-muted-foreground hidden sm:block">{m.user_email}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select value={m.role} onValueChange={(role) => updateRoleMutation.mutate({ memberId: m.id, role })}>
                        <SelectTrigger className={cn("w-24 sm:w-28 text-xs", getRoleBadgeColor(m.role))}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="agent">Agent</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="owner">Owner</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm text-muted-foreground hidden sm:table-cell">{formatDate(m.joined_at)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeMutation.mutate(m.id)} className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
