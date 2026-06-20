"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
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
  Command,
} from "lucide-react";
import { useUIStore, useAuthStore, useNotificationStore } from "@/stores";
import Link from "next/link";

export function Header() {
  const pathname = usePathname();
  const { toggleSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [userMenuOpen]);

  // Close search on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setUserMenuOpen(false);
      }
      // Cmd/Ctrl+K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = segments.map((s, i) => ({
    label: s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " "),
    href: "/" + segments.slice(0, i + 1).join("/"),
  }));

  return (
    <>
      <header className="h-14 border-b border-border bg-card/80 glass flex items-center justify-between px-3 sm:px-4 sticky top-0 z-sticky flex-shrink-0">
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
                      ? "text-foreground font-medium"
                      : "hover:text-foreground cursor-pointer"
                  )}
                >
                  {b.label}
                </span>
              </span>
            ))}
          </nav>

          {/* Mobile: show only current page name */}
          <span className="sm:hidden text-sm font-medium truncate">
            {breadcrumbs[breadcrumbs.length - 1]?.label || "Dashboard"}
          </span>
        </div>

        {/* Right: search + notifications + user */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Notifications */}
          <button
            className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground relative transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
            )}
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent transition-colors"
              aria-label="User menu"
            >
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                {user?.first_name?.[0] || user?.email?.[0] || "U"}
              </div>
              <span className="text-sm font-medium hidden md:block max-w-[100px] truncate">
                {user?.first_name || "User"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
            </button>

            {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-border bg-card shadow-lg z-popover py-1 animate-scale-in origin-top-right">
                <div className="px-3 py-2.5 border-b border-border">
                  <p className="text-sm font-medium truncate">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
                <div className="py-1">
                  <Link
                    href="/settings/profile"
                    className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    Settings
                  </Link>
                </div>
                <div className="border-t border-border pt-1">
                  <button
                    onClick={logout}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent w-full text-left text-destructive transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Search overlay */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-modal bg-black/50 flex items-start justify-center pt-[15vh] sm:pt-[20vh] animate-fade-in px-4"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-card rounded-xl border border-border shadow-2xl overflow-hidden animate-scale-in">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search anything..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  autoFocus
                />
                <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground flex-shrink-0">
                  ESC
                </kbd>
                <button
                  onClick={() => setSearchOpen(false)}
                  className="sm:hidden p-1 rounded hover:bg-accent text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-3 text-center">
                <p className="text-sm text-muted-foreground">
                  Type to search across your workspace
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">⌘K</kbd> to open search
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
