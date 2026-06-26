import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import Page from "../page";
import { setStatsFetcher } from "@/lib/connector/useConnectorStats";
import { setAlertsFetcher } from "@/lib/connector/useConnectorAlerts";

beforeEach(() => {
  setStatsFetcher(async (path) => {
    if (path.startsWith("/api/connector/tenants")) {
      return { tenants: ["acme-corp", "globex-inc", "initech", "stark-industries"] };
    }
    if (path.startsWith("/api/connector/agents/count")) {
      return { total_agents: 152 };
    }
    throw new Error("unexpected: " + path);
  });
  setAlertsFetcher(async () => ({
    critical: [{ id: "c1" }], high: [{ id: "h1" }, { id: "h2" }], warning: [], total: 3
  }));
});

describe("Overview page", () => {
  it("renders the connection banner", async () => {
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByTestId("connection-banner")).toBeInTheDocument();
    });
  });

  it("renders 4 tenants from the connector", async () => {
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();
      expect(screen.getByText(/Globex/)).toBeInTheDocument();
      expect(screen.getByText(/Initech/)).toBeInTheDocument();
      expect(screen.getByText(/Stark/)).toBeInTheDocument();
    });
  });

  it("renders the agent count KPI", async () => {
    render(<Page />);
    await waitFor(() => {
      const kpis = screen.getAllByText("152");
      expect(kpis.length).toBeGreaterThan(0);
    });
  });
});
