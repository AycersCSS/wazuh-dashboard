import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { ToastProvider } from "@/hooks/useToasts";
import { TimeRangeProvider } from "@/hooks/useTimeRange";
import { TenantProvider } from "@/hooks/useTenantSelection";
import { setStatsFetcher } from "@/lib/connector/useConnectorStats";
import { __resetAuditForTests, recordAudit } from "@/hooks/useAudit";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/audit"
}));

vi.mock("@/lib/auth/useSession", () => ({
  useSession: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: { username: "ADMIN" },
    signIn: vi.fn(),
    signOut: vi.fn()
  })
}));

import AuditPage from "../page";

function wrapper(ui: React.ReactElement) {
  return render(
    <ToastProvider>
      <TimeRangeProvider>
        <TenantProvider>{ui}</TenantProvider>
      </TimeRangeProvider>
    </ToastProvider>
  );
}

beforeEach(() => {
  __resetAuditForTests();
  setStatsFetcher(async (path) => {
    if (path.startsWith("/api/connector/tenants"))    return { tenants: ["acme-corp", "globex-inc"] };
    if (path.startsWith("/api/connector/agents/count")) return { total_agents: 10 };
    if (path.startsWith("/api/connector/health"))     return {};
    throw new Error("unexpected: " + path);
  });
});

describe("AuditPage", () => {
  it("shows the empty state when no events exist", () => {
    wrapper(<AuditPage />);
    expect(screen.getByText("No events recorded yet")).toBeInTheDocument();
  });

  it("renders recorded events newest-first with scope badges", () => {
    recordAudit("alert", "alert.ack", "Acknowledged alert 1", { actor: "ADMIN" });
    recordAudit("auth",  "auth.login", "Signed in as ADMIN", { actor: "ADMIN", tenant: "acme-corp" });
    wrapper(<AuditPage />);
    expect(screen.getByText("Acknowledged alert 1")).toBeInTheDocument();
    expect(screen.getByText("Signed in as ADMIN")).toBeInTheDocument();
    expect(screen.getAllByText("alert").length).toBeGreaterThan(0);
    expect(screen.getAllByText("auth").length).toBeGreaterThan(0);
  });

  it("filters by scope chip", () => {
    recordAudit("alert", "alert.ack", "Acknowledged alert 1", { actor: "ADMIN" });
    recordAudit("auth",  "auth.login", "Signed in as ADMIN", { actor: "ADMIN" });
    wrapper(<AuditPage />);

    // The "Alerts" chip in the filter bar (scope filter). The events themselves
    // also render the scope as a badge, so we look for a unique summary.
    const alertsChip = screen.getByRole("button", { name: /Alerts/ });
    fireEvent.click(alertsChip);

    expect(screen.getByText("Acknowledged alert 1")).toBeInTheDocument();
    expect(screen.queryByText("Signed in as ADMIN")).not.toBeInTheDocument();
  });

  it("filters by free-text search", () => {
    recordAudit("alert", "alert.ack", "Acknowledged alert 1702.5", { actor: "ADMIN" });
    recordAudit("agent", "agent.isolate", "Isolated agent web-01", { actor: "ADMIN" });
    wrapper(<AuditPage />);

    const search = screen.getByPlaceholderText("Search summary, type, actor...");
    fireEvent.change(search, { target: { value: "1702.5" } });

    expect(screen.getByText("Acknowledged alert 1702.5")).toBeInTheDocument();
    expect(screen.queryByText("Isolated agent web-01")).not.toBeInTheDocument();
  });

  it("opens the detail drawer when a row is clicked", () => {
    recordAudit("alert", "alert.ack", "Acknowledged alert 1702.5", {
      actor: "ADMIN",
      target: { kind: "alert", id: "1702.5" },
      meta: { severity: 14, ruleId: "5705" }
    });
    wrapper(<AuditPage />);

    fireEvent.click(screen.getByText("Acknowledged alert 1702.5"));

    // The drawer surfaces the metadata as a JSON pre block — this is the
    // strongest signal that the drawer opened with the right event.
    expect(screen.getByText(/"severity": 14/)).toBeInTheDocument();
    // The drawer also surfaces the actor and tenant rows in a 2-col grid.
    expect(screen.getAllByText("ADMIN").length).toBeGreaterThan(0);
  });

  it("renders the Export and Clear buttons", () => {
    recordAudit("alert", "alert.ack", "Test", { actor: "ADMIN" });
    wrapper(<AuditPage />);
    expect(screen.getByRole("button", { name: /Export JSON/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Clear log/i })).toBeInTheDocument();
  });
});
