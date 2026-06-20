"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, Search, Bell, ChevronDown, LogOut, Settings, User } from "lucide-react";
import { useUIStore, useAuthStore, useNotificationStore } from "@/stores";

export function Header() {
  const pathname = usePathname();
  const { toggleSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = segments.map((s, i) => ({
    label: s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " "),
    href: "/" + segments.slice(0, i + 1).join("/"),
  }));

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-3 sm:px-4 sticky top-0 z-40">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <button onClick={toggleSidebar} className="lg:hidden p-1.5 rounded-md hover:bg-accent flex-shrink-0">
          <Menu className="h-5 w-5" />
        </button>
        <nav className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-muted-foreground min-w-0 overflow-hidden">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1 sm:gap-1.5 min-w-0">
              {i > 0 && <span className="text-border flex-shrink-0">/</span>}
              <span className={cn(
                "hover:text-foreground cursor-pointer truncate",
                i === breadcrumbs.length - 1 && "text-foreground font-medium",
                i < breadcrumbs.length - 1 && "hidden sm:inline"
              )}>
                {b.label}
              </span>
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <button className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] text-white flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        <div className="relative">
          <button onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-1.5 rounded-md hover:bg-accent">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
              {user?.first_name?.[0] || "U"}
            </div>
            <span className="text-sm font-medium hidden sm:block">{user?.first_name || "User"}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-50" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-44 sm:w-48 rounded-md border border-border bg-card shadow-lg z-50 py-1">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-sm font-medium truncate">{user?.first_name} {user?.last_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <a href="/settings/profile" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"><User className="h-3.5 w-3.5" />Profile</a>
                <a href="/settings" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"><Settings className="h-3.5 w-3.5" />Settings</a>
                <button onClick={logout} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent w-full text-left text-destructive">
                  <LogOut className="h-3.5 w-3.5" />Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
