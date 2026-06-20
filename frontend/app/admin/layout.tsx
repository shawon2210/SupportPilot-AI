"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useUIStore } from "@/stores";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { sidebarOpen } = useUIStore();

  useEffect(() => {
    useUIStore.getState().setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <>
          <div className="hidden lg:block"><Sidebar /></div>
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="w-72 max-w-[85vw]"><Sidebar /></div>
            <div className="flex-1 bg-black/50" onClick={() => useUIStore.getState().setSidebarOpen(false)} />
          </div>
        </>
      )}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
