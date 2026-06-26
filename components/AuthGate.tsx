"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/useSession";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.replace("/login");
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-300">Loading…</div>;
  }
  if (!isAuthenticated) return null;
  return <>{children}</>;
}
