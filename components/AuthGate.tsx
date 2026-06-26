"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/useSession";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && pathname !== "/login") {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (pathname === "/login") return <>{children}</>;
  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-300">Loading…</div>;
  }
  if (!isAuthenticated) return null;
  return <>{children}</>;
}
