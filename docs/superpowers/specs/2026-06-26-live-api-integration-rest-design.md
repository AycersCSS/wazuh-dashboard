# Live API Connector Integration — REST Design Spec (v2)

**Date:** 2026-06-26
**Status:** Awaiting user sign-off
**Supersedes:** `2026-06-26-live-api-integration-design.md` (the WebSocket v1)

> **Why v2:** the actual MergeIT Connector at
> `D:\projects\apiconnector\MergeIT-WazuhConnector` is a Python/Flask
> REST service with JWT auth, not the WebSocket service v1 assumed.
> v2 mirrors the real connector's endpoint surface, auth model, and
> read-only constraint.

---

## 1. Purpose

Replace the static mock data feeding the **Overview page** of the
MergeIT SOC dashboard with live data from the real
MergeIT-WazuhConnector. The dashboard becomes a JWT-authenticated
admin SPA that polls the connector on a 30-second interval.

**In scope (this round):**
- Admin sign-in via the connector's `POST /authenticate`.
- JWT stored in an httpOnly cookie set by Next.js.
- Next.js API routes proxy every connector call. Browser never
  touches the connector directly.
- `useConnectorStats()` and `useConnectorAlerts()` hooks with
  30-second polling and stale-after-60s banner.
- Overview page reads tenants + alerts from the connector.

**Out of scope (this round):**
- The five use-case pages (`/microsoft-365`, `/ninjaone`,
  `/bitdefender`, `/cyber-essentials`, `/customer-portal`) keep
  their existing mock data.
- Customer sign-in flow (`/customer/login`, `/customer/register`) —
  admin-only for this round.
- Any command/control endpoint (restart, isolate, sync). The
  connector is read-only as it stands; the 5 use-case pages lose
  those affordances until the connector grows them.
- The "Sync now" button on integration cards. Removed for this
  round; the affordance comes back when commands exist.

---

## 2. Architecture

```
Browser (Overview page)
   │  useConnectorStats() / useConnectorAlerts()
   │    interval polling (30s), stale after 60s
   ▼
Next.js API routes (app/api/connector/*)
   │  Read JWT from httpOnly cookie
   │  Forward Authorization: Bearer <jwt>
   ▼
MergeIT-WazuhConnector  (http://localhost:5000 in dev)
   │  Flask + SQLite
   │  Endpoints: /authenticate, /stats/agents, /alerts, /tenants
   ▼
Wazuh Manager  (https://your-wazuh-server:55000)
   │  /security/user/authenticate
   │  /agents
   │  /security/alerts
```

**Why a Next.js proxy and not browser→connector direct:**
- The connector is a service account consumer; putting it behind a
  proxy lets the admin's JWT live in an httpOnly cookie, not
  exposed to the browser.
- One origin for CORS; no need to configure the Flask side.
- Centralized error mapping and caching later if needed.

**Why polling 30s and not WebSocket:** the connector is read-only
REST. There's no server push. 30s is the Wazuh API's natural
refresh cadence for agent/alert stats; the page reflects it
without thrashing the backend.

**Why MSW for dev mocks:** the connector requires a real Wazuh
backend (with credentials) to do anything useful. MSW lets the UI
work fully against canned data that matches the connector's actual
response shapes. When the user supplies `CONNECTOR_BASE_URL` to a
real connector, MSW is bypassed.

---

## 3. Endpoints used (from the real connector)

All requests go through Next.js API routes. The browser never calls
the connector directly.

| Proxy route (Next.js) | Connector route | Method | Used for |
|-----------------------|-----------------|--------|----------|
| `POST /api/connector/auth/login` | `/authenticate` | POST | Admin sign-in |
| `POST /api/connector/auth/logout` | (none) | POST | Clears cookie |
| `GET /api/connector/agents/count` | `/stats/agents` | GET | "Total agents" KPI |
| `GET /api/connector/alerts` | `/alerts` | GET | Per-tenant alert breakdown |
| `GET /api/connector/tenants` | `/tenants` | GET | MSP fleet list |
| `GET /api/connector/health` | (probes `/tenants`) | GET | Banner status check |

### 3.1 Admin sign-in

**Request** (browser → `/api/connector/auth/login`):
```json
{ "username": "wazuh-user", "password": "wazuh-pass" }
```

**Server action**: forwards to `POST {CONNECTOR_BASE_URL}/authenticate`,
receives `{ token: "<jwt>" }`, sets an httpOnly cookie
`connector_jwt` with the token, returns `{ ok: true }` to the browser.

**Errors mapped to HTTP:**
- connector 400 → 400 (missing creds)
- connector 401 → 401 (invalid creds)
- connector 502 → 502 (malformed response)
- connector 503 → 503 (unreachable)

### 3.2 Data endpoints

**`GET /api/connector/agents/count?status=&tenant=`** →
forwards to `/stats/agents?status=&tenant=`. Returns
`{ total_agents: number }`.

**`GET /api/connector/alerts?limit=&time_range=&tenant=`** →
forwards to `/alerts?limit=&time_range=&tenant=`. Returns
`{ critical: Alert[], high: Alert[], warning: Alert[], total: number }`.

**`GET /api/connector/tenants`** → forwards to `/tenants`. Returns
`{ tenants: string[] }`.

**`GET /api/connector/health`** → probes `/tenants` with a short
timeout. Returns `{ ok: true }` or 503.

### 3.3 Auth model

- **No** auth on the dashboard's public pages (login screen is the
  only pre-auth route).
- **All `/api/connector/*` proxy routes** require the
  `connector_jwt` httpOnly cookie. If missing or invalid, return
  401. The hook treats 401 as a sign-out signal — clears local
  state, redirects to the login screen.
- **Cookie attributes**: `HttpOnly; SameSite=Lax; Path=/;`
  `Secure` in production (when `NODE_ENV=production`).
- **Token lifetime**: whatever the connector issues (the connector
  doesn't expose a `max-age`; the Wazuh default is 30 minutes). The
  cookie matches.
- **No refresh logic** in this round — when the JWT expires, the
  next data call returns 401 and the UI bounces to login.

---

## 4. Components

### 4.1 New files

```
app/api/connector/auth/login/route.ts       ← Admin sign-in (POST → connector /authenticate)
app/api/connector/auth/logout/route.ts      ← Cookie clear (POST)
app/api/connector/agents/count/route.ts     ← Proxy to /stats/agents
app/api/connector/alerts/route.ts           ← Proxy to /alerts
app/api/connector/tenants/route.ts          ← Proxy to /tenants
app/api/connector/health/route.ts           ← Health probe

lib/connector/
  types.ts                                  ← Response types matching connector shapes
  client.ts                                 ← Server-only fetch wrapper (reads cookie, adds Bearer)
  useConnectorStats.ts                      ← Client hook: tenants + agents count, 30s polling
  useConnectorAlerts.ts                     ← Client hook: alerts per tenant, 30s polling
  index.ts                                  ← Public re-exports

lib/auth/
  session.ts                                ← Server-only: getJwt(), setJwt(), clearJwt()
  useSession.ts                             ← Client hook: { isAuthenticated, signIn, signOut }

mocks/
  handlers.ts                               ← MSW handlers matching real connector response shapes
  browser.ts                                ← MSW setupWorker (dev only)
  server.ts                                 ← MSW setupServer (test only)
  data.ts                                   ← Canned tenants, alerts, agent counts

app/login/page.tsx                          ← Admin sign-in screen
components/connector/ConnectionBanner.tsx   ← Live / stale / unauthenticated banner (reused from v1)
components/connector/StatusFooter.tsx       ← Footer-level status indicator (small)

__tests__/
  lib/connector/client.test.ts
  lib/connector/useConnectorStats.test.ts
  lib/connector/useConnectorAlerts.test.ts
  lib/auth/session.test.ts
  app/api/connector/auth/login/route.test.ts
  app/api/connector/agents/count/route.test.ts
  app/api/connector/alerts/route.test.ts
  app/api/connector/tenants/route.test.ts
  app/api/connector/health/route.test.ts
  app/login/page.test.tsx
```

### 4.2 Modified files (1)

- `app/page.tsx` — swap `data/integrations` and `data/tenants` for
  `useConnectorStats()` + `useConnectorAlerts()`. Add
  `ConnectionBanner` (with a new "unauthenticated" state for 401).
  Remove the "Sync now" button (no command endpoint yet). No
  layout changes.

### 4.3 Boundary principle

`lib/connector/client.ts` is the only file that knows about the
real connector URL and JWT. Components import hooks; hooks import
client. The real connector URL lives in a single env var
(`CONNECTOR_BASE_URL`) read only on the server.

---

## 5. Hook contracts

### 5.1 `useConnectorStats()`

```ts
function useConnectorStats(): {
  status: "CONNECTING" | "CONNECTED" | "STALE" | "UNAUTHENTICATED" | "ERROR";
  lastFetchedAt: number | null;
  tenants: string[];            // tenant IDs from /tenants
  totalAgents: number | null;   // from /stats/agents
  error: string | null;
  refetch: () => void;          // manual refresh
}
```

- Fires the first fetch **immediately on mount** (synchronous with
  the effect), then every 30 seconds.
- Polls `/api/connector/tenants` and `/api/connector/agents/count`
  in parallel (Promise.all).
- 401 → `UNAUTHENTICATED`, clears the cookie via the proxy.
- Network error / 5xx → `ERROR`, banner shows error.
- No successful fetch for 60s → `STALE`, last good data still shown.
- Manual `refetch()` clears stale state and refetches both
  endpoints.

### 5.2 `useConnectorAlerts(tenantId: string | null)`

```ts
function useConnectorAlerts(tenantId: string | null): {
  status: "IDLE" | "LOADING" | "STALE" | "UNAUTHENTICATED" | "ERROR";
  lastFetchedAt: number | null;
  alerts: { critical: number; high: number; warning: number; total: number };
  error: string | null;
}
```

- Fires the first fetch immediately on mount when `tenantId` is
  non-null, then every 30 seconds.
- Polls `/api/connector/alerts?tenant=<id>&limit=200&time_range=7d`.
- Counts come from `response.critical.length`,
  `response.high.length`, `response.warning.length` (the connector
  already returns bucketed arrays; we count, we don't summarize).
- `IDLE` when `tenantId` is null. No fetch, no polling.
- `tenantId` changes (e.g., Overview page loops the 4 tenants)
  cancel the in-flight poll and start a new one for the new id.
- Stale after 60s without a successful response for the current
  `tenantId`.

### 5.3 `useSession()`

```ts
function useSession(): {
  isAuthenticated: boolean;
  isLoading: boolean;            // initial cookie check
  signIn: (creds: { username: string; password: string }) => Promise<{ ok: true } | { ok: false; error: string }>;
  signOut: () => Promise<void>;
  user: { username: string } | null;
}
```

- `isAuthenticated` is determined by a one-time `GET /api/connector/health`
  on mount. If 200, authenticated. If 401, not.
- `signIn` calls `POST /api/connector/auth/login`. On success, the
  cookie is set by the proxy. On 401, returns `{ ok: false, error }`.
- `signOut` calls `POST /api/connector/auth/logout`, clears the
  cookie, resets local state.

---

## 6. UI flow

```
                ┌──────────────────────────┐
                │  /login (admin sign-in)  │
                └────────────┬─────────────┘
                             │ signIn() ok
                             ▼
       ┌──────────────────────────────────────────┐
       │  / (Overview)                            │
       │   ┌────────────────────────────────┐     │
       │   │ Banner: Live | Stale | Error   │     │
       │   └────────────────────────────────┘     │
       │   • 5 integration cards (mock, v1)        │
       │   • 4 tenants (live from /tenants)        │
       │   • Per-tenant alert breakdowns (live)   │
       │   • "Fleet at a glance" KPIs (live)      │
       └──────────────────────────────────────────┘
                             │ 401 (JWT expired)
                             ▼
                ┌──────────────────────────┐
                │  /login (back to start)  │
                └──────────────────────────┘
```

- The "Sync now" button from v1 is **removed**. We add it back when
  the connector gains command endpoints.
- Sign-out is in the topbar (replaces the existing nav user menu if
  present, otherwise a small button in the corner).

---

## 7. Dev mocks (MSW)

`mocks/handlers.ts` exports MSW request handlers that return
shapes matching the real connector exactly. **Crucially: the
browser-side handlers intercept the proxy routes (`/api/connector/*`),
not the connector's own URLs** — the proxy is part of the system
under test. The MSW server (for vitest) intercepts the same paths.

| Handler (intercepted) | Forwards to | Returns |
|----------------------|-------------|---------|
| `POST /api/connector/auth/login` | connector `/authenticate` (when not mocked) | `{ ok: true }` and sets cookie |
| `GET /api/connector/tenants` | connector `/tenants` (when not mocked) | `{ tenants: ["acme-corp", "globex-inc", "initech", "stark-industries"] }` |
| `GET /api/connector/agents/count` | connector `/stats/agents` (when not mocked) | `{ total_agents: 152 }` |
| `GET /api/connector/alerts?tenant=acme-corp` | connector `/alerts?tenant=acme-corp&limit=200&time_range=7d` (when not mocked) | `{ critical: [...], high: [...], warning: [...], total: 412 }` |

`mocks/browser.ts` exports `startMocks()` which calls
`setupWorker(...handlers).start()`. Called from the root layout in
dev when `process.env.NEXT_PUBLIC_USE_MOCKS === "1"`. The `.env.example`
ships with `NEXT_PUBLIC_USE_MOCKS=1` so dev works out of the box.
Set to `0` and provide `CONNECTOR_BASE_URL` to use the real connector.

`mocks/server.ts` exports `setupMocks()` (for vitest) which calls
`setupServer(...handlers).listen()`. Called from a vitest setup file.

**Why MSW and not a hand-rolled mock:** MSW intercepts the same
`fetch` calls the app makes, so the hooks see a real network round
trip (with realistic timing) and the tests can use the same
handlers via `setupServer`. No special "mock mode" branching in
the hook code.

---

## 8. Error handling

| Failure | User-facing | Recovery |
|---------|-------------|----------|
| Sign-in: 401 (bad creds) | Toast: "Invalid credentials" | User retries |
| Sign-in: 503 (connector down) | Banner + "Retry" button on login page | User clicks retry |
| 401 on data fetch | "Session expired" toast → redirect to `/login` | Sign in again |
| 5xx on data fetch | Banner: "Connector error" + last good data | Auto-retry on next poll |
| Network timeout (10s) | Same as 5xx | Auto-retry |
| Stale (>60s no success) | Banner: "Stale — last update Xs ago" | Auto-retry on next poll |
| Stale + repeated failure | Banner: "Stale — unable to reach connector" + "Retry now" button | Manual |

### 8.1 Strict rules

1. Server payload always wins. No client-side mutation of
   received data.
2. Failed fetches keep the last good data on screen; the banner
   says what's wrong.
3. All errors log to `console.error` with the request URL and
   status. Not user-blocking.
4. No retries in-page beyond the polling interval. If a manual
   `refetch()` is exposed, that's the user's only path to force a
   retry.
5. The JWT cookie is cleared on every 401 from the proxy. This
   prevents loops where the dashboard keeps trying with a dead
   token.

---

## 9. Environment configuration

`.env.example` (server-side only, never exposed to browser):

```
# Real connector (Flask service)
CONNECTOR_BASE_URL=http://localhost:5000
# Wazuh manager (the connector talks to it; the dashboard doesn't)
WAZUH_API_URL=https://your-wazuh-server:55000

# Dev: 1 to use MSW mocks, 0 to use the real connector.
# Default: 1 if CONNECTOR_BASE_URL is unset, 0 otherwise.
NEXT_PUBLIC_USE_MOCKS=1

# Sign-in cookie name and attributes (optional overrides)
CONNECTOR_JWT_COOKIE=connector_jwt
```

**Why `NEXT_PUBLIC_USE_MOCKS` is the only `NEXT_PUBLIC_*`:** the
dashboard otherwise has zero need to know the connector URL; that
lives server-side. The mock toggle is the one knob the browser
needs because it determines whether MSW starts.

---

## 10. Testing

### 10.1 Unit tests

- `lib/connector/client.test.ts` — adds `Authorization: Bearer`
  when cookie present, returns typed errors on non-2xx.
- `lib/auth/session.test.ts` — get/set/clear cookie, signs are
  correct.
- `lib/connector/useConnectorStats.test.ts` — polls on mount,
  polls every 30s, sets STALE after 60s, refetch works,
  UNAUTHENTICATED on 401, ERROR on 5xx. Uses MSW handlers in
  `mocks/server.ts` for real network semantics; `vi.useFakeTimers()`
  for the interval.
- `lib/connector/useConnectorAlerts.test.ts` — same shape, scoped
  per tenant, IDLE when null.
- `app/login/page.test.tsx` — signIn form submits, errors display,
  redirects on success.

### 10.2 Route tests

- `app/api/connector/auth/login/route.test.ts` — happy path,
  400, 401, 502, 503, cookie set.
- `app/api/connector/agents/count/route.test.ts` — proxy with
  cookie, 401 without, query param passthrough.
- `app/api/connector/alerts/route.test.ts` — same shape, query
  passthrough.
- `app/api/connector/tenants/route.test.ts` — same.
- `app/api/connector/health/route.test.ts` — 200 ok / 503 down.

### 10.3 Coverage target

90%+ for `lib/connector/*` and `lib/auth/*`.

### 10.4 Explicitly not tested

- Real Wazuh connectivity (out of scope; tests use MSW).
- Visual regressions (no Chromatic/Playwright in this project).

---

## 11. Open follow-ups

- Customer sign-in (`/customer/login`) — add when the per-tenant
  customer dashboard is in scope.
- Command endpoints on the connector (restart, isolate) — add
  `useConnectorCommand()` and the Sync now button when the
  connector grows them.
- MSW + Vitest integration patterns: confirm that
  `setupServer(...handlers).listen()` is the right pattern in
  this project's existing vitest setup. If it conflicts with
  jsdom, fall back to hand-rolled `vi.fn()` mocks in the hook
  tests.
- Rate limiting the login route: out of scope for v1, but the
  proxy should add a basic per-IP rate limit before public
  exposure. Tracked separately.
