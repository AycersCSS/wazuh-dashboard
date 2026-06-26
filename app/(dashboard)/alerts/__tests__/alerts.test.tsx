import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TimeRangeProvider } from "@/hooks/useTimeRange";
import { ToastProvider } from "@/hooks/useToasts";
import AlertsPage from "../page";

function wrap(ui: React.ReactNode) {
  return render(<ToastProvider><TimeRangeProvider>{ui}</TimeRangeProvider></ToastProvider>);
}

describe("/alerts page", () => {
  it("renders page header and table", () => {
    wrap(<AlertsPage />);
    expect(screen.getByRole("heading", { name: "Alerts" })).toBeInTheDocument();
    expect(screen.getAllByText(/critical/i).length).toBeGreaterThan(0);
  });
});
