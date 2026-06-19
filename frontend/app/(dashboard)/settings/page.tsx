"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { User, Shield, CreditCard, FileText, Puzzle, Code, ChevronRight, Settings, Mail, Search, Bell, Lock } from "lucide-react";
import { useAuthStore } from "@/stores";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { toast } from "sonner";

const sections = [
  { href: "/settings/profile", icon: User, title: "Profile", desc: "Manage your account information", category: "account", badge: null },
  { href: "/settings/features", icon: Puzzle, title: "Feature Flags", desc: "Manage feature availability", category: "account", badge: "3 active" },
  { href: "/settings/audit", icon: FileText, title: "Audit Logs", desc: "View workspace activity history", category: "account", badge: null },
  { href: "/billing", icon: CreditCard, title: "Billing", desc: "Subscription and payment management", category: "billing", badge: null },
  { href: "/developers/api-keys", icon: Code, title: "API Keys", desc: "Manage API access keys", category: "developers", badge: null },
  { href: "/developers/webhooks", icon: Code, title: "Webhooks", desc: "Configure webhook integrations", category: "developers", badge: null },
];

function getInitials(first?: string, last?: string, email?: string) {
  if (first || last) return `${(first || "").charAt(0)}${(last || "").charAt(0)}`.toUpperCase();
  if (email) return email.charAt(0).toUpperCase();
  return "?";
}

export default function SettingsPage() {
  const { user, isLoading } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredSections = searchQuery
    ? sections.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.desc.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sections;

  const accountSections = filteredSections.filter((s) => s.category === "account");
  const billingSections = filteredSections.filter((s) => s.category === "billing");
  const developerSections = filteredSections.filter((s) => s.category === "developers");

  if (!mounted || isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
          </div>
          <p className="text-muted-foreground mt-1">Manage your workspace and account settings</p>
        </div>
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 w-full sm:w-[220px] text-sm"
          />
        </div>
      </div>

      {/* Profile Summary Card */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
              <AvatarImage src={user?.avatar_url} alt={user?.first_name || user?.email || "User"} />
              <AvatarFallback className="text-lg font-semibold">
                {getInitials(user?.first_name, user?.last_name, user?.email || undefined)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold truncate">
                {user?.first_name ? `${user.first_name} ${user?.last_name || ""}`.trim() : "Your Account"}
              </h2>
              <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1 text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                <span className="text-sm truncate">{user?.email || "No email"}</span>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  {user?.id ? "Active" : "Guest"}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  2FA Enabled
                </Badge>
              </div>
            </div>
            <Link
              href="/settings/profile"
              className="text-sm text-primary hover:underline whitespace-nowrap"
            >
              Edit Profile
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Search Results Info */}
      {searchQuery && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredSections.length} result{filteredSections.length !== 1 ? "s" : ""} for &quot;{searchQuery}&quot;
          </p>
          <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
            Clear
          </Button>
        </div>
      )}

      {/* Empty State */}
      {filteredSections.length === 0 && (
        <EmptyState
          icon={<Search className="h-10 w-10" />}
          title="No settings found"
          description={`No settings match "${searchQuery}". Try a different search term.`}
          action={{ label: "Clear search", onClick: () => setSearchQuery("") }}
        />
      )}

      {/* Account Settings */}
      {accountSections.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1">Account</h2>
          <Card>
            <CardContent className="p-0">
              {accountSections.map((s, i) => (
                <div key={s.href}>
                  {i > 0 && <Separator />}
                  <Link href={s.href} className="flex items-center gap-4 p-4 hover:bg-accent transition-colors group">
                    <div className="p-2 rounded-md bg-primary/10 flex-shrink-0">
                      <s.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.desc}</p>
                    </div>
                    {s.badge && (
                      <Badge variant="secondary" className="text-[10px] flex-shrink-0">{s.badge}</Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground flex-shrink-0" />
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Billing */}
      {billingSections.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1">Billing</h2>
          <Card>
            <CardContent className="p-0">
              {billingSections.map((s, i) => (
                <div key={s.href}>
                  {i > 0 && <Separator />}
                  <Link href={s.href} className="flex items-center gap-4 p-4 hover:bg-accent transition-colors group">
                    <div className="p-2 rounded-md bg-primary/10 flex-shrink-0">
                      <s.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground flex-shrink-0" />
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Developers */}
      {developerSections.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1">Developers</h2>
          <Card>
            <CardContent className="p-0">
              {developerSections.map((s, i) => (
                <div key={s.href}>
                  {i > 0 && <Separator />}
                  <Link href={s.href} className="flex items-center gap-4 p-4 hover:bg-accent transition-colors group">
                    <div className="p-2 rounded-md bg-primary/10 flex-shrink-0">
                      <s.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground flex-shrink-0" />
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
