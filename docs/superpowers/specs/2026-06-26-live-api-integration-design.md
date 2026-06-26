# Live API Connector Integration — Design Spec

**Date:** 2026-06-26
**Status:** Approved
**Author:** Brainstorming session with the user

---

## 1. Purpose

Replace the static mock data feeding the **Overview page** of the
MergeIT SOC dashboard with live data from a real WebSocket-backed
API connector. Wire up bidirectional commands so admins can perform
actions like restarting or isolating a machine from the dashboard.

Out of scope for this round: the five use-case pages
(`/microsoft-365`, `/ninjaone`, `/bitdefender`,
`/cyber-essentials`, `/customer-portal`) keep their existing mock
data. The connector's data shape is designed so those pages can be
wired up later as configuration only.

---

## 2. Architecture

```
Browser (Overview page)
   │  useConnector() hook
   │    state: { status, lastMessageAt, tenants, integrations }
   │    actions: { restartMachine(id), isolateMachine(id) }
   │    optimistic + ACK
   ▼
Next.js API route (/api/connector/ws)
   │  Trust all incoming requests (public dashboard)
   ▼
MergeIT Connector
   │  channels: tenants | integrations | tenant:<id>
   │  commands: restart_machine | isolate_machine | ...
   │  ACKs: { id, status, result }
   ▼
Tenant APIs (M365, NinjaOne, Bitdefender, CE)
```

**Why a Next.js proxy and not browser→connector direct:**
- Connector token stays server-side.
- No CORS configuration on the connector.
- Single env var exposed to the browser
  (`NEXT_PUBLIC_CONNECTOR_WS_URL`).

**Why WebSocket and not REST polling / SSE:**
- Required for bidirectional commands (restart, isolate).
- Server can push state without waiting for a poll.
- One persistent connection amortizes auth cost.

**Why Option A (connector is source of truth) over Option B (dashboard
calls tenant APIs directly) or Option C (hybrid):**
- The MergeIT Connector already handles auth, rate limits, and webhook
  plumbing.
- Future use-case pages drop in as config, not rebuilds.

---

## 3. Channel protocol

A single WebSocket carries many channels. JSON messages in both
directions.

| Direction | Shape |
|-----------|-------|
| Client → Server (subscribe) | `{ op: "subscribe", channel: "tenants" \| "integrations" \| "tenant:<id>" }` |
| Server → Client (push) | `{ op: "state", channel, payload, ts }` |
| Client → Server (command) | `{ op: "cmd", id: "<uuid>", channel, action, target }` |
| Server → Client (ack) | `{ op: "ack", id, status: "ok" \| "error", result? }` |

`parseMessage` in `lib/connector/protocol.ts` guards every incoming
message. Malformed JSON, unknown `op`, or missing required fields
throw or return `"unknown"`. The hook logs and drops bad messages
— it does not crash the WS.

---

## 4. Components

### 4.1 New files

```
app/api/connector/ws/route.ts              ← Next.js WebSocket proxy
lib/connector/protocol.ts                  ← Message types + parseMessage() guard
lib/connector/useConnector.ts              ← React hook: WS + subs + actions
lib/connector/mockServer.ts                ← Dev mock until real connector ships
lib/connector/index.ts                     ← Public re-exports
components/connector/ConnectionBanner.tsx  ← Live / reconnecting / stale banner
components/connector/IntegrationStatusDot.tsx  ← Reusable pulsing dot
types/connector.ts                         ← Shared types (re-exported)
```

### 4.2 Modified files

- `app/page.tsx` — swap `data/integrations` and `data/tenants`
  imports for `useConnector()`. Add `ConnectionBanner` at the top of
  the page. No layout changes.

### 4.3 Boundary principle

`useConnector` is the only file in the app that knows there's a
WebSocket. Every consumer gets typed data and functions; the
transport is invisible. This is what lets the next 4 use-case pages
drop in as "swap mock for hook."

---

## 5. State machine

```
            ws.open
   ┌──────────────────────► CONNECTED ───► (steady state)
   │                          │
   │                          │ ws.close / error
   │                          ▼
   │                       RECONNECTING  (exp. backoff, cap 30s)
   │                          │
   │                          │ retry succeeds
   │                          ▼
   └──────────────────────  CONNECTED
                              │
                              │ no message for > 2× expected interval
                              ▼
                           STALE  (last good snapshot still shown)
                              │
                              │ message arrives
                              ▼
                          CONNECTED
```

**Stale threshold:** `2 × max(subscribed-channel interval)`. Default
60s for the Overview subscriptions.

**Reconnect backoff:** 1s, 2s, 4s, 8s, 16s, 30s (cap), with ±20%
jitter. A `setTimeout` ref is stored so retries don't pile up; cleared
on unmount.

---

## 6. Subscription lifecycle

1. On `CONNECTED`, the hook re-sends every active subscription (kept
   in a `useRef<Set<channel>>`).
2. Each `state` message replaces (or merges into) the appropriate
   slice of state. Per-channel state lives in separate `useState`
   variables so a `tenants` update doesn't re-render integration
   cards.
3. ACKs resolve promises from a `pendingCommands: Map<id, ...>`.

---

## 7. Optimistic + ACK flow

```
User clicks "Sync now"
  │
  ▼
Hook.sendCommand({ id: uuid, action, target })
  │  (1) optimistically mutate local state
  │  (2) store promise in pendingCommands
  │  (3) send WS message
  │
  ├──► ack { id, status: "ok" }   → resolve, replace state with server payload
  ├──► ack { id, status: "error" } → reject, roll back, toast error
  └──► 10s timeout                  → reject, roll back, toast "Connector didn't respond"
```

Destructive actions (`restart_machine`, `isolate_machine`) require a
`ConfirmDialog` click first; otherwise the flow is identical.

---

## 8. Error handling

| Failure | User-facing | Auto-recover |
|---------|-------------|--------------|
| WS upgrade fails | "Reconnecting…" | yes, backoff |
| WS drops mid-stream | "Reconnecting… last Xm ago" | yes, backoff |
| 401/403 on upgrade | "Auth failed" + sign-in button | no (unreachable in this design — see §9) |
| Malformed JSON | console warn, drop | implicit |
| Unknown `op` | console warn, drop | implicit |
| State for unsubscribed channel | console warn | implicit |
| ACK for unknown id | console warn | implicit |
| 10s ACK timeout | toast, roll back | yes for state |
| Two browser tabs | independent WSs | n/a |
| Page hidden | WS stays open | n/a |
| User navigates away | close WS, reject pending | implicit |
| Server push contradicts optimistic | server wins | implicit |

### 8.1 Strict rules

1. Server payload always wins.
2. Reconnect resets all in-flight optimistic state — no resend (would
   double-execute destructive actions).
3. Backoff has ±20% jitter (prevent thundering herd).
4. Message rate cap 100/sec, drop + warn (protects from runaway
   server).
5. No silent failures — every drop logs `console.warn` with type and
   reason.

---

## 9. Auth (public dashboard, this round)

The dashboard is currently public. The proxy route
(`app/api/connector/ws/route.ts`) trusts all incoming requests. The
connector lives on a private network.

The "Auth failed" terminal state is **kept in code** (so it's safe to
enable later if a sign-in flow is added) but **unreachable in this
design**. No test cases for it. The 401/403 detection in the hook
remains as defensive code.

---

## 10. Mock mode

When `NEXT_PUBLIC_CONNECTOR_MOCK=1` (default until the real
connector ships), `useConnector` does **not** open a WS at all. It
spins up `MockConnector`, an in-memory implementation that emits
state diffs on a `setInterval` (5–15s) and ACKs commands. The mock
implements the exact same protocol the real connector will. Mock →
real is a one-line env change.

This lets us build, screenshot, and test the UI today, before the
real connector exists.

---

## 11. Testing

### 11.1 New test files

- `lib/connector/protocol.test.ts` — `parseMessage` guards
  (well-formed, malformed JSON, unknown op, missing fields, wrong
  shapes).
- `lib/connector/useConnector.test.ts` — using a fake `WebSocket`:
  open/close on mount, subscribes on subscribe, state updates per
  channel, ignores unsubscribed channels, sendCommand/ack flow,
  10s timeout, reconnect + backoff schedule, rate cap 100/s,
  optimistic rollback on error and on timeout.
- `lib/connector/mockServer.test.ts` — emits state at intervals,
  ACKs commands, supports restart/isolate, simulates disconnect.
- `components/connector/ConnectionBanner.test.tsx` — Live /
  Reconnecting / Stale rendering with timestamps.
- `app/page.test.tsx` (new) — Overview renders cards + tenants from
  hook, ConnectionBanner present, Sync now → ConfirmDialog →
  sendCommand.
- `app/api/connector/ws/route.test.ts` — upgrade succeeds, token
  passed through, bytes proxied both ways.

### 11.2 Coverage target

90%+ for `lib/connector/*`.

### 11.3 Explicitly not tested

- Real connector behavior (doesn't exist yet).
- Browser-specific WS behavior (jsdom-level is enough).
- Visual regressions (no Chromatic / Playwright in this project).

---

## 12. Out of scope (deferred)

- The 5 use-case pages stay on mock data. (Tracked for the next
  round.)
- Pre-existing React Doctor warnings in `components/Topbar.tsx`,
  `components/ui/ConfirmDialog.tsx`, `components/ui/Drawer.tsx` —
  behavior-changing, separate PR. Logged in `howididit.md`.

---

## 13. Open follow-ups (not blocking this work)

- Confirm the exact `channel` name and payload shape with the
  MergeIT Connector team once the connector spec lands.
- Decide whether `useConnector` should expose a `useChannel(channel)`
  variant for use-case pages that subscribe to a single channel.
- Add a `pause()` / `resume()` API on the hook for pages that go
  through heavy interactions.
