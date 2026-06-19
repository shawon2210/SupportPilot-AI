"use client";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useUIStore } from "@/stores";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, sidebarCollapsed } = useUIStore();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <>
          <div className="hidden lg:block"><Sidebar /></div>
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="w-64"><Sidebar /></div>
            <div className="flex-1 bg-black/50" onClick={() => useUIStore.getState().setSidebarOpen(false)} />
          </div>
        </>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
