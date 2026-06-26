import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { seedDatabase } from "@/data/seed";
import { getSession, requireSession, SessionError } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getTenantSnapshot } from "@/lib/wazuh/client";
import { PortalSidebar } from "@/components/portal/Sidebar";
import { PortalTopbar } from "@/components/portal/Topbar";
import { CommandPalette } from "@/components/portal/CommandPalette";
import { ToastProvider } from "@/components/providers/ToastProvider";

interface TenantRow {
  id: string;
  name: string;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum";
}

function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]!.toUpperCase())
    .join("");
}

export default async function PortalLayout({ children }: { children: ReactNode }) {
  // Ensure the database schema and seed rows exist on first hit.
  seedDatabase();

  // If no session at all, bounce to /login. requireSession throws on expired,
  // but we also explicitly redirect to /login for missing sessions.
  const session = await getSession();
  if (!session.userId) redirect("/login");
  let resolved;
  try {
    resolved = await requireSession();
  } catch (err) {
    if (err instanceof SessionError) redirect("/login");
    throw err;
  }

  const db = getDb();
  const tenant = db
    .prepare("SELECT id, name, tier FROM tenants WHERE id = ?")
    .get(resolved.tenantId) as TenantRow | undefined;

  if (!tenant) redirect("/login");

  const snapshot = getTenantSnapshot({ id: tenant.id, name: tenant.name, tier: tenant.tier });

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-navy text-cream">
        <PortalSidebar
          tenantName={tenant.name}
          tenantTier={tenant.tier}
          securityScore={snapshot.securityScore}
          openIncidents={snapshot.openIncidents}
        />
        <div className="flex-1 min-w-0 flex flex-col">
          <PortalTopbar
            user={{
              name:       resolved.name,
              email:      resolved.email,
              tenantName: tenant.name,
              tenantTier: tenant.tier,
              role:       resolved.role,
              initials:   initialsFor(resolved.name)
            }}
          />
          <main id="main" className="flex-1 min-w-0 px-4 md:px-6 py-5 md:py-6">
            {children}
          </main>
        </div>
      </div>
      <CommandPalette />
    </ToastProvider>
  );
}
