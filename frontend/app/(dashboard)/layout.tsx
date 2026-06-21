"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useUIStore, useAuthStore } from "@/stores";
import { cn } from "@/lib/utils";
import { LayoutDashboard, MessageSquare, BookOpen, Settings } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { sidebarOpen, sidebarCollapsed, setSidebarOpen } = useUIStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

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

  if (isLoading) {
    return (
      <div className="flex h-screen h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

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

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-overlay flex">
          <div className="w-64 max-w-[80vw] h-full">
            <Sidebar />
          </div>
          <div
            className="flex-1 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 pb-20 lg:pb-6 safe-bottom">
          {children}
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
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
