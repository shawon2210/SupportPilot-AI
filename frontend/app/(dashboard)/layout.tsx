"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useUIStore, useAuthStore } from "@/stores";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
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
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 safe-bottom">
          {children}
        </main>
      </div>
    </div>
  );
}
