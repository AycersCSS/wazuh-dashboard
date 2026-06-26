import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConnectionBanner } from "../ConnectionBanner";

describe("ConnectionBanner", () => {
  it("renders 'Connecting…' when CONNECTING", () => {
    render(<ConnectionBanner status="CONNECTING" lastFetchedAt={null} />);
    expect(screen.getByText(/Connecting/)).toBeInTheDocument();
  });

  it("renders 'Live' when connected", () => {
    render(<ConnectionBanner status="CONNECTED" lastFetchedAt={Date.now()} />);
    expect(screen.getByText(/Live/)).toBeInTheDocument();
  });

  it("renders 'Stale' with timestamp", () => {
    render(<ConnectionBanner status="STALE" lastFetchedAt={Date.now() - 5 * 60_000} />);
    expect(screen.getByText(/Stale/)).toBeInTheDocument();
  });

  it("renders 'Connector error' on ERROR", () => {
    render(<ConnectionBanner status="ERROR" lastFetchedAt={Date.now() - 1_000} />);
    expect(screen.getByText(/Connector error/)).toBeInTheDocument();
  });

  it("renders 'Sign in' link on UNAUTHENTICATED", () => {
    render(<ConnectionBanner status="UNAUTHENTICATED" lastFetchedAt={null} />);
    const link = screen.getByRole("link", { name: /Sign in/i });
    expect(link).toHaveAttribute("href", "/login");
  });
});
