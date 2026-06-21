"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  BarChart3,
  Users,
  Puzzle,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  Rocket,
  ShieldCheck,
  X,
  LogOut,
  Sparkles,
  Zap,
  Search,
  History,
  AlertTriangle,
  ArrowUpCircle,
  Tag,
} from "lucide-react";
import { useUIStore, useAuthStore } from "@/stores";
import { WorkspaceSwitcher } from "./workspace-switcher";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion } from "framer-motion";

const mainNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/team", label: "Team", icon: Users },
  { href: "/widget", label: "Widget", icon: Puzzle },
];

const aiNav = [
  { href: "/ai/replies", label: "AI Replies", icon: Sparkles },
  { href: "/ai/classification", label: "Classification", icon: Tag },
  { href: "/ai/escalation", label: "Escalation", icon: ArrowUpCircle },
  { href: "/ai/knowledge-gaps", label: "Knowledge Gaps", icon: AlertTriangle },
];

const bottomNav = [
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/admin", label: "Admin", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];

/* ─── Nav Link with optional Tooltip ─────────────────────────── */
function NavLink({
  item,
  isActive,
  collapsed,
  onClick,
}: {
  item: { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
  isActive: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const linkContent = (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-primary/10 text-primary shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
        collapsed && "justify-center px-2"
      )}
    >
      {/* Active indicator bar */}
      {isActive && <div className="sidebar-active-indicator" />}
      <item.icon
        className={cn(
          "h-[18px] w-[18px] flex-shrink-0 transition-transform duration-200",
          isActive && "text-primary"
        )}
      />
      {!collapsed && <span>{item.label}</span>}
      {isActive && !collapsed && (
        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          <p>{item.label}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebarCollapse, setSidebarOpen } = useUIStore();
  const { logout, user } = useAuthStore();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  return (
    <TooltipProvider>
      <motion.aside
        layout
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "flex flex-col h-full bg-card border-r border-border",
          sidebarCollapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex items-center h-14 sm:h-[60px] border-b border-border px-4 flex-shrink-0",
            sidebarCollapsed ? "justify-center" : "gap-3"
          )}
        >
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <Rocket className="h-4 w-4 text-white" />
          </div>
          {!sidebarCollapsed && (
            <span className="text-base font-bold tracking-tight truncate">
              SupportPilot
            </span>
          )}
          {/* Mobile close button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden ml-auto p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Workspace switcher — only when expanded */}
        {!sidebarCollapsed && (
          <div className="px-3 py-3 border-b border-border flex-shrink-0">
            <WorkspaceSwitcher />
          </div>
        )}

        {/* Navigation */}
        <nav
          className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide"
          role="navigation"
          aria-label="Main navigation"
        >
          {/* Main section */}
          {!sidebarCollapsed && (
            <p className="px-3 mb-2 label-caps">
              Main
            </p>
          )}
          {mainNav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={isActive(item.href)}
              collapsed={sidebarCollapsed}
              onClick={handleNavClick}
            />
          ))}

          {/* AI section */}
          <div className="pt-4">
            {!sidebarCollapsed && (
              <p className="px-3 mb-2 label-caps">
                AI Tools
              </p>
            )}
            {aiNav.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                isActive={isActive(item.href)}
                collapsed={sidebarCollapsed}
                onClick={handleNavClick}
              />
            ))}
          </div>

          {/* Settings section */}
          <div className="pt-4">
            {!sidebarCollapsed && (
              <p className="px-3 mb-2 label-caps">
                Settings
              </p>
            )}
            {bottomNav.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                isActive={isActive(item.href)}
                collapsed={sidebarCollapsed}
                onClick={handleNavClick}
              />
            ))}
          </div>
        </nav>

        {/* Bottom section */}
        <div className="border-t border-border p-3 space-y-1 flex-shrink-0">
          {/* User info — only when expanded */}
          {!sidebarCollapsed && user && (
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {user.first_name?.[0] || user.email?.[0] || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.first_name || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
          )}

          {/* Collapse toggle — desktop only */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={toggleSidebarCollapse}
                className={cn(
                  "hidden lg:flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors",
                  sidebarCollapsed && "justify-center px-2"
                )}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <>
                    <ChevronLeft className="h-4 w-4" />
                    <span>Collapse</span>
                  </>
                )}
              </button>
            </TooltipTrigger>
            {sidebarCollapsed && (
              <TooltipContent side="right" sideOffset={8}>
                <p>Expand</p>
              </TooltipContent>
            )}
          </Tooltip>

          {/* Logout — always visible */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={logout}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
                  sidebarCollapsed && "justify-center px-2"
                )}
                aria-label="Sign Out"
              >
                <LogOut className="h-4 w-4 flex-shrink-0" />
                {!sidebarCollapsed && <span>Sign Out</span>}
              </button>
            </TooltipTrigger>
            {sidebarCollapsed && (
              <TooltipContent side="right" sideOffset={8}>
                <p>Sign Out</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}
