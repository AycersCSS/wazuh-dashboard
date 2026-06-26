import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "@/app/login/page";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh })
}));

describe("login page", () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    global.fetch = vi.fn();
  });

  it("submits the email, transitions to the code stage, and calls the verify endpoint", async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, name: "Alice" }) });

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText("you@company.com"), "admin@acme.test");
    await user.click(screen.getByRole("button", { name: /send code/i }));

    await waitFor(() => expect(screen.getByPlaceholderText("000000")).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText("000000"), "123456");
    await user.click(screen.getByRole("button", { name: /verify and sign in/i }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/");
      expect(refresh).toHaveBeenCalled();
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("shows a humanized error if send-otp fails", async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: false, json: async () => ({ ok: false, error: "send_failed" }) });

    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText("you@company.com"), "admin@acme.test");
    await user.click(screen.getByRole("button", { name: /send code/i }));

    expect(await screen.findByText(/try again/i)).toBeInTheDocument();
  });
});
