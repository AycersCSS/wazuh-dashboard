"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy /tenant → admin fleet panel */
export default function TenantRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin");
  }, [router]);
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-slate-400 text-sm">
      Redirecting to Admin fleet…
    </div>
  );
}
