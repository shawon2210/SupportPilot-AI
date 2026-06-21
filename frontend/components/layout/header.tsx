"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  Settings,
  User,
  X,
  Sun,
  Moon,
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  BarChart3,
  Users,
  Trash2,
  Check,
} from "lucide-react";
import { useUIStore, useAuthStore, useNotificationStore } from "@/stores";
import Link from "next/link";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { toggleSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const {
    notifications,
    unreadCount,
    markAllAsRead,
    clearAll,
    markAsRead,
    addNotification,
  } = useNotificationStore();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pre-populate mock notifications if store is empty
  useEffect(() => {
    if (notifications.length === 0) {
      addNotification({
        title: "CNAME Custom Domain Connected",
        message: "Your domain support.acme.com is successfully routed to SupportPilot.",
        type: "success",
      });
      addNotification({
        title: "Support AI Training Completed",
        message: "Your AI agent has indexed 156 documents and is ready on auto-pilot.",
        type: "success",
      });
      addNotification({
        title: "New Knowledge Gap Identified",
        message: "Customers frequently asked about 'refund policy' which is missing from docs.",
        type: "warning",
      });
    }
  }, [addNotification, notifications.length]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setNotificationOpen(false);
      }
    };
    if (userMenuOpen || notificationOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [userMenuOpen, notificationOpen]);

  // Close search on Escape and CMD+K shortcut
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setUserMenuOpen(false);
        setNotificationOpen(false);
      }
      // Cmd/Ctrl+K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
    setNotificationOpen(false);
    toast.success("Notification marked as read");
  };

  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAllAsRead();
    toast.success("All notifications marked as read");
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearAll();
    toast.success("Cleared all notifications");
  };

  const handleToggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
    setSearchOpen(false);
    toast.success(`Theme switched to ${theme === "dark" ? "light" : "dark"}`);
  };

  const handleClearNotifications = () => {
    clearAll();
    setSearchOpen(false);
    toast.success("Notifications cleared");
  };

  const handleCommandNavigate = (href: string) => {
    setSearchOpen(false);
    router.push(href);
  };

  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = segments.map((s, i) => ({
    label: s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " "),
    href: "/" + segments.slice(0, i + 1).join("/"),
  }));

  return (
    <>
      <header role="banner" className="h-14 border-b border-border bg-card/85 glass flex items-center justify-between px-3 sm:px-4 sticky top-0 z-sticky flex-shrink-0">
        {/* Left: menu + breadcrumbs */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 rounded-lg hover:bg-accent flex-shrink-0 transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumbs — hidden on very small screens */}
          <nav className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground min-w-0">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-1 min-w-0">
                {i > 0 && <span className="text-border flex-shrink-0">/</span>}
                <span
                  className={cn(
                    "truncate",
                    i === breadcrumbs.length - 1
                      ? "text-foreground font-semibold"
                      : "hover:text-foreground cursor-pointer"
                  )}
                >
                  {b.label}
                </span>
              </span>
            ))}
          </nav>

          {/* Mobile: show only current page name */}
          <span className="sm:hidden text-sm font-semibold truncate">
            {breadcrumbs[breadcrumbs.length - 1]?.label || "Dashboard"}
          </span>
        </div>

        {/* Right: search + theme + notifications + user */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
            <kbd className="hidden md:inline-flex h-5 select-none items-center gap-0.5 rounded border border-border bg-muted/60 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span>⌘</span>K
            </kbd>
          </button>

          {/* Theme switcher */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle theme"
          >
            {mounted && theme === "dark" ? (
              <Sun className="h-4 w-4 text-yellow-500 fill-yellow-500/20" />
            ) : (
              <Moon className="h-4 w-4 text-primary" />
            )}
          </button>

          {/* Notification Popover Dropdown */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setNotificationOpen(!notificationOpen)}
              className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground relative transition-colors"
              aria-label="Notifications"
              aria-expanded={notificationOpen}
              aria-haspopup="true"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-card animate-pulse" />
              )}
            </button>

            {notificationOpen && (
              <div role="menu" className="absolute right-0 top-full mt-1.5 w-80 rounded-xl border border-border bg-card shadow-lg z-popover py-1 animate-scale-in origin-top-right">
                <div className="px-3.5 py-2.5 border-b border-border flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-semibold">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-[10px] sm:text-xs text-primary hover:underline font-semibold"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-border/60">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          "px-3.5 py-3 text-xs transition-colors hover:bg-accent/40 flex items-start gap-2.5 cursor-pointer",
                          !n.read && "bg-primary/5"
                        )}
                        onClick={() => handleNotificationClick(n.id)}
                      >
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full mt-1.5 flex-shrink-0",
                            n.read ? "bg-transparent" : "bg-primary"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={cn("font-medium truncate", !n.read && "text-foreground font-semibold")}>
                            {n.title}
                          </p>
                          {n.message && (
                            <p className="text-muted-foreground mt-0.5 leading-relaxed text-[11px]">
                              {n.message}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="border-t border-border pt-1 px-3.5 py-1.5 flex justify-end">
                    <button
                      onClick={handleClearAll}
                      className="text-[10px] text-muted-foreground hover:text-foreground font-medium"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent transition-colors"
              aria-label="User menu"
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                {user?.first_name?.[0] || user?.email?.[0] || "U"}
              </div>
              <span className="text-sm font-semibold hidden md:block max-w-[100px] truncate">
                {user?.first_name || "User"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
            </button>

            {userMenuOpen && (
              <div role="menu" className="absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-border bg-card shadow-lg z-popover py-1 animate-scale-in origin-top-right">
                <div className="px-3 py-2.5 border-b border-border">
                  <p className="text-sm font-semibold truncate">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
                <div className="py-1">
                  <Link
                    href="/settings/profile"
                    className="flex items-center justify-between px-3 py-2 text-sm hover:bg-accent transition-colors group"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <div className="flex items-center gap-2.5">
                      <User className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                      <span>Profile</span>
                    </div>
                    <kbd className="text-[10px] font-mono text-muted-foreground/80 bg-muted px-1 rounded">⌥P</kbd>
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center justify-between px-3 py-2 text-sm hover:bg-accent transition-colors group"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <div className="flex items-center gap-2.5">
                      <Settings className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                      <span>Settings</span>
                    </div>
                    <kbd className="text-[10px] font-mono text-muted-foreground/80 bg-muted px-1 rounded">⌥S</kbd>
                  </Link>
                </div>
                <div className="border-t border-border pt-1">
                  <button
                    onClick={logout}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent w-full text-left text-destructive transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* CMDK Command Palette Dialog */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Type a command or search workspace..." />
        <CommandList className="scrollbar-thin">
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Navigation Pages">
            <CommandItem onSelect={() => handleCommandNavigate("/dashboard")}>
              <LayoutDashboard className="mr-2.5 h-4 w-4 text-muted-foreground" />
              <span>Go to Dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => handleCommandNavigate("/knowledge")}>
              <BookOpen className="mr-2.5 h-4 w-4 text-muted-foreground" />
              <span>Go to Knowledge Base</span>
            </CommandItem>
            <CommandItem onSelect={() => handleCommandNavigate("/chat")}>
              <MessageSquare className="mr-2.5 h-4 w-4 text-muted-foreground" />
              <span>Go to AI Conversations</span>
            </CommandItem>
            <CommandItem onSelect={() => handleCommandNavigate("/analytics")}>
              <BarChart3 className="mr-2.5 h-4 w-4 text-muted-foreground" />
              <span>Go to Analytics Reports</span>
            </CommandItem>
            <CommandItem onSelect={() => handleCommandNavigate("/team")}>
              <Users className="mr-2.5 h-4 w-4 text-muted-foreground" />
              <span>Go to Team Workspace</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Quick Commands">
            <CommandItem onSelect={handleToggleTheme}>
              <Sun className="mr-2.5 h-4 w-4 text-muted-foreground" />
              <span>Toggle Light / Dark Theme</span>
            </CommandItem>
            <CommandItem onSelect={handleClearNotifications}>
              <Trash2 className="mr-2.5 h-4 w-4 text-muted-foreground" />
              <span>Clear All Notifications</span>
            </CommandItem>
            <CommandItem onSelect={() => handleCommandNavigate("/settings")}>
              <Settings className="mr-2.5 h-4 w-4 text-muted-foreground" />
              <span>Open settings console</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
