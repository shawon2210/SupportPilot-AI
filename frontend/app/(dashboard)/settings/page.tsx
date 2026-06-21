"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  User, Shield, CreditCard, FileText, Puzzle, Code, ChevronRight,
  Settings, Mail, Search, Lock, Bell, Palette, Globe, Key, Webhook,
  Sparkles
} from "lucide-react";
import { useAuthStore } from "@/stores";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/ui/empty-state";

const sections = [
  { href: "/settings/profile", icon: User, title: "Profile", desc: "Manage your account information", category: "account", badge: null, color: "text-blue-500", bg: "bg-blue-500/10" },
  { href: "/settings/features", icon: Puzzle, title: "Feature Flags", desc: "Manage feature availability", category: "account", badge: "3 active", color: "text-purple-500", bg: "bg-purple-500/10" },
  { href: "/settings/audit", icon: FileText, title: "Audit Logs", desc: "View workspace activity history", category: "account", badge: null, color: "text-orange-500", bg: "bg-orange-500/10" },
  { href: "/billing", icon: CreditCard, title: "Billing", desc: "Subscription and payment management", category: "billing", badge: null, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { href: "/developers/api-keys", icon: Key, title: "API Keys", desc: "Manage API access keys", category: "developers", badge: null, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { href: "/developers/webhooks", icon: Webhook, title: "Webhooks", desc: "Configure webhook integrations", category: "developers", badge: null, color: "text-pink-500", bg: "bg-pink-500/10" },
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
      <div className="max-w-3xl mx-auto px-3 sm:px-6 space-y-6 animate-fade-in">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Card>
          <CardContent className="p-4 sm:p-6 flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
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
    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-sm">
              <Settings className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
          </div>
          <p className="text-sm text-muted-foreground">Manage your workspace and account settings</p>
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
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-transparent p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 ring-4 ring-background shadow-lg">
                <AvatarImage src={user?.avatar_url} alt={user?.first_name || user?.email || "User"} />
                <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
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
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-2.5 flex-wrap">
                  <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                    <Shield className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    2FA Enabled
                  </Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild className="h-9">
                <Link href="/settings/profile">Edit Profile</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Results Info */}
      {searchQuery && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredSections.length} result{filteredSections.length !== 1 ? "s" : ""} for &quot;{searchQuery}&quot;
          </p>
          <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="h-7 text-xs">
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
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Account</h2>
          <Card>
            <CardContent className="p-2 sm:p-3">
              {accountSections.map((s, i) => (
                <div key={s.href}>
                  {i > 0 && <Separator className="mx-2" />}
                  <Link href={s.href} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/60 active:scale-[0.99] transition-all group">
                    <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      <s.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${s.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{s.desc}</p>
                    </div>
                    {s.badge && (
                      <Badge variant="secondary" className="text-[10px] flex-shrink-0">{s.badge}</Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all flex-shrink-0" />
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
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Billing</h2>
          <Card>
            <CardContent className="p-2 sm:p-3">
              {billingSections.map((s, i) => (
                <div key={s.href}>
                  {i > 0 && <Separator className="mx-2" />}
                  <Link href={s.href} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/60 active:scale-[0.99] transition-all group">
                    <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      <s.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${s.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{s.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all flex-shrink-0" />
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
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Developers</h2>
          <Card>
            <CardContent className="p-2 sm:p-3">
              {developerSections.map((s, i) => (
                <div key={s.href}>
                  {i > 0 && <Separator className="mx-2" />}
                  <Link href={s.href} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/60 active:scale-[0.99] transition-all group">
                    <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      <s.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${s.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{s.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all flex-shrink-0" />
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
