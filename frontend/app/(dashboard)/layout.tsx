"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useUIStore, useAuthStore, useWorkspaceStore } from "@/stores";
import { cn } from "@/lib/utils";
import { LayoutDashboard, MessageSquare, BookOpen, Settings } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { sidebarOpen, sidebarCollapsed, setSidebarOpen } = useUIStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.isLoading);
  const { currentWorkspace, workspaces, setCurrentWorkspace } = useWorkspaceStore();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, authLoading, router]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen && typeof window !== "undefined" && window.innerWidth < 1024) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [sidebarOpen]);

  // Auto-close sidebar on mobile, auto-open on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setSidebarOpen]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen h-dvh overflow-hidden bg-background">
      {/* Desktop sidebar — always visible when sidebarOpen is true and screen >= 1024px */}
      <div
        className={cn(
          "hidden lg:flex flex-col transition-all duration-300",
          sidebarOpen ? (sidebarCollapsed ? "w-[72px]" : "w-[260px]") : "w-0"
        )}
      >
        {sidebarOpen && <Sidebar />}
      </div>

      {/* Mobile sidebar overlay — animated */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-overlay flex">
            {/* Backdrop fade */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Sidebar slide-in */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-64 max-w-[80vw] h-full z-10"
            >
              <Sidebar />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 pb-20 lg:pb-6 safe-bottom">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/95 glass border-t border-border z-sticky flex items-center justify-around px-2 pb-safe shadow-lg">
        {[
          { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { href: "/chat", label: "Chat", icon: MessageSquare },
          { href: "/knowledge", label: "Knowledge", icon: BookOpen },
          { href: "/settings", label: "Settings", icon: Settings },
        ].map((item) => {
          const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 gap-1 text-[10px] font-semibold transition-all duration-150",
                active 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 transition-transform duration-200", active && "scale-110")} />
              <span>{item.label}</span>
              {active && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute bottom-1 h-0.5 w-6 rounded-full bg-primary"
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
