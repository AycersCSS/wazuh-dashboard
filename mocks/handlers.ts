import { http, HttpResponse } from "msw";
import { MOCK_TENANTS, MOCK_AGENT_COUNT, mockAlertsFor } from "./data";

// These handlers intercept the Next.js proxy routes in dev (via
// setupWorker) and in tests (via setupServer). They return shapes
// that match the real connector so the hooks see realistic data.

export const handlers = [
  http.post("/api/connector/auth/login", async ({ request }) => {
    const body = (await request.json()) as { username?: string; password?: string };
    if (!body.username || !body.password) {
      return HttpResponse.json({ ok: false, error: "missing" }, { status: 400 });
    }
    if (body.password === "wrong") {
      return HttpResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }
    return HttpResponse.json({ ok: true });
  }),

  http.post("/api/connector/auth/logout", () => {
    return HttpResponse.json({ ok: true });
  }),

  http.get("/api/connector/tenants", () => {
    return HttpResponse.json({ tenants: MOCK_TENANTS });
  }),

  http.get("/api/connector/agents/count", () => {
    return HttpResponse.json({ total_agents: MOCK_AGENT_COUNT });
  }),

  http.get("/api/connector/alerts", ({ request }) => {
    const url = new URL(request.url);
    const tenant = url.searchParams.get("tenant") ?? "";
    return HttpResponse.json(mockAlertsFor(tenant));
  }),

  http.get("/api/connector/health", () => {
    return HttpResponse.json({ ok: true });
  })
];
