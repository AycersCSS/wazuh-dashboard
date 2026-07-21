"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { CommandPalette } from "@/components/CommandPalette";
import { TenantProvider } from "@/hooks/useTenantSelection";
import { useSession } from "@/lib/auth/useSession";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.replace("/login");
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy text-navy-600 text-sm">
        Loading…
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <TenantProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only fixed top-2 left-2 z-50 inline-flex items-center h-9 px-3 rounded-lg text-sm font-medium bg-emerald-400 text-[#121212]"
      >
        Skip to main content
      </a>
      <div className="flex min-h-screen bg-navy text-cream">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col min-h-screen">
          <Topbar />
          <main id="main" className="flex-1 min-w-0 px-4 md:px-8 py-5 md:py-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
      <CommandPalette />
    </TenantProvider>
  );
}
