import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let pushSpy: ReturnType<typeof vi.fn>;
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushSpy, replace: vi.fn(), back: vi.fn() })
}));

global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
  if (url === "/api/connector/health") return new Response("{}", { status: 401 });
  if (url === "/api/connector/auth/login" && init?.method === "POST") {
    return new Response('{"ok":true}', { status: 200 });
  }
  return new Response("{}", { status: 404 });
}) as never;

import LoginPage from "../page";

beforeEach(() => { pushSpy = vi.fn(); });

describe("LoginPage", () => {
  it("submits and redirects on success", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText(/Username/i), "wazuh-user");
    await user.type(screen.getByLabelText(/Password/i), "secret");
    await user.click(screen.getByRole("button", { name: /Sign in/i }));
    await waitFor(() => {
      expect(pushSpy).toHaveBeenCalledWith("/");
    });
  });
});
