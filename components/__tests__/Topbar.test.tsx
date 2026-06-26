import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { setStatsFetcher } from "@/lib/connector/useConnectorStats";
import { ToastProvider } from "@/hooks/useToasts";
import { TimeRangeProvider } from "@/hooks/useTimeRange";

// Mock next/navigation (Topbar's useRouter + AuthGate in the test tree).
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/"
}));

import { Topbar } from "../Topbar";

let mockTenants: string[] = [];
let mockAgents: number = 0;

const fetcher = vi.fn(async (path: string) => {
  if (path.startsWith("/api/connector/tenants"))    return { tenants: mockTenants };
  if (path.startsWith("/api/connector/agents/count")) return { total_agents: mockAgents };
  if (path.startsWith("/api/connector/health"))     return {};
  throw new Error("unexpected path: " + path);
});

beforeEach(() => {
  setStatsFetcher(fetcher);
  mockTenants = [];
  mockAgents = 0;
  fetcher.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ToastProvider>
      <TimeRangeProvider>
        {ui}
      </TimeRangeProvider>
    </ToastProvider>
  );
}

describe("Topbar tenant dropdown", () => {
  it("shows 'All tenants' by default and renders the live tenant list when opened", async () => {
    mockTenants = ["acme-corp", "globex-inc"];
    mockAgents = 152;
    renderWithProviders(<Topbar />);

    // Wait for useConnectorStats to resolve.
    await act(async () => { await Promise.resolve(); });

    // Trigger label
    expect(screen.getByRole("button", { name: /All tenants/i })).toBeInTheDocument();

    // Open the dropdown
    fireEvent.click(screen.getByRole("button", { name: /All tenants/i }));

    // Both the trigger and the dropdown row say "All tenants" — assert the
    // row inside the dropdown panel by looking for its sub-line instead.
    expect(screen.getByText("152 agents · Fleet-wide view")).toBeInTheDocument();
    // Live tenant rows from the connector
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Globex")).toBeInTheDocument();
    // Sub-lines: "Platinum tier" / "Gold tier" come from lib/tenantDisplay
    expect(screen.getByText("Platinum tier")).toBeInTheDocument();
    expect(screen.getByText("Gold tier")).toBeInTheDocument();
  });

  it("falls back to the raw tenant ID when the connector returns an unknown ID", async () => {
    mockTenants = ["new-corp-xyz"];
    mockAgents = 7;
    renderWithProviders(<Topbar />);
    await act(async () => { await Promise.resolve(); });

    fireEvent.click(screen.getByRole("button", { name: /All tenants/i }));
    // Unknown IDs render as-is; no tier sub-line because TIER_BY_TENANT misses
    expect(screen.getByText("new-corp-xyz")).toBeInTheDocument();
  });

  it("shows the connector status pill when status is not CONNECTED", async () => {
    // Default: useConnectorStats starts in "CONNECTING" before the first fetch resolves.
    // We render before resolving, so the pill should be present.
    mockTenants = [];
    mockAgents = 0;
    renderWithProviders(<Topbar />);

    // Pill is present immediately (status is CONNECTING until the first tick).
    expect(screen.getByTestId("topbar-connection-status")).toBeInTheDocument();
    expect(screen.getByText("Connecting…")).toBeInTheDocument();
  });
});
