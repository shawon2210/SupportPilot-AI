"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useUIStore } from "@/stores";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  useEffect(() => {
    useUIStore.getState().setSidebarOpen(false);
  }, [pathname]);

  // Auto-close sidebar on mobile
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

  return (
    <div className="flex h-screen h-dvh overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div
        className={`hidden lg:flex flex-col transition-all duration-300 ${
          sidebarOpen ? "w-[260px]" : "w-0"
        }`}
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

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 safe-bottom">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
