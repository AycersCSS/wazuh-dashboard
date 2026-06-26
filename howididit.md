# How I Did It — Live API Connector Integration

A running log of every design decision, file created, and step taken while
integrating a live WebSocket-backed API connector into the MergeIT SOC
dashboard. Updated continuously as work progresses.

---

## Project preferences (confirmed with user)

- **Project log file:** `howididit.md` — every design decision, every file
  created, and every step taken must be written down here as it happens.
  This is a standing project rule, not a one-off.
- **Why:** User asked explicitly: "for everything you design or do please
  mark it down in a .md file called howididit.md".
- **How to apply:** Append to this file after every meaningful action
  (design section, approach choice, file write, command run). Do not batch
  — log as you go so the file always reflects the current state.

---

## Project context (discovered during exploration)

- **Repo:** `D:\projects\dashboard` (Next.js 14 app router, React 18,
  Tailwind, Recharts, Vitest)
- **Product:** MergeIT SOC dashboard — managed security operations
  across Microsoft 365, NinjaOne, Bitdefender, Cyber Essentials, and
  a customer portal.
- **Data layer:** All client-side. `data/integrations.ts` and
  `data/tenants.ts` are static mock arrays. No backend, no `app/api/`
  folder, no env-var handling.
- **Pages in scope (this round):** Overview (`/`) only. The five use-case
  pages (`/microsoft-365`, `/ninjaone`, `/bitdefender`,
  `/cyber-essentials`, `/customer-portal`) keep their mock data for now.
- **Existing dependencies:** No SWR/React Query, no WebSocket library,
  no SSE library. Tooling is intentionally thin.

---

## Brainstorming session — 2026-06-26

### Step 1 — Explored project context

Read `package.json`, `app/layout.tsx`, `app/page.tsx`, `data/integrations.ts`,
`data/tenants.ts`, `next.config.mjs`. Listed repo structure.

### Step 2 — Clarifying questions asked (one at a time)

| # | Question                              | User's answer                                               |
|---|---------------------------------------|-------------------------------------------------------------|
| 1 | Which page should the connector feed? | Overview only; other 5 use cases stay on mock data for now |
| 2 | REST polling / SSE / WebSocket?       | WebSocket — needed for bidirectional actions like restart/isolate machine |
| 3 | Where does the WS terminate?          | Proxy via Next.js API route (server-side token, single CORS origin) |
| 4 | Failure mode?                         | Show stale last-known snapshot + reconnect banner           |
| 5 | WS library?                           | Thin custom client (~100 lines, zero deps, full reconnect control) |
| 6 | Action UX?                            | Optimistic update + server ACK                              |

### Step 3 — Approach chosen: **Option A**

> **Option A — Connector is source of truth, Next.js is a dumb proxy.**
> Browser ⇄ Next.js (proxy + auth) ⇄ MergeIT Connector ⇄ Tenant APIs.
>
> Picked because the connector already exists/coming-soon and will serve
> all 5 use cases. Designing for it now means the next 4 use-case pages
> drop in as config rather than per-integration rebuilds.

Rejected:
- **Option B** (dashboard calls tenant APIs directly) — duplicates
  auth/rate-limit/webhook plumbing the connector already does.
- **Option C** (hybrid: connector for state, direct for actions) — two
  surfaces, two auth contexts, hard to justify.

### Step 4 — Design sections (in progress)

#### Section 1 — Architecture & data flow (APPROVED)

```
Browser (Overview page)
   │  useConnector() hook
   │    state: { status, lastMessageAt, tenants, integrations }
   │    actions: { restartMachine(id), isolateMachine(id) }
   │    optimistic + ACK
   ▼
Next.js API route (/api/connector/ws)
   │  Auth (session cookie → connector token)
   ▼
MergeIT Connector
   │  channels: tenants | integrations | tenant:<id>
   │  commands: restart_machine | isolate_machine | ...
   │  ACKs: { id, status, result }
   ▼
Tenant APIs (M365, NinjaOne, Bitdefender, CE)
```

**Channel protocol (single WS, many channels):**
- Subscribe: `{ op: "subscribe", channel: "tenants" | "integrations" | "tenant:<id>" }`
- Server push: `{ op: "state", channel, payload, ts }`
- Client command: `{ op: "cmd", id: "<uuid>", channel, action, target }`
- Server ACK: `{ op: "ack", id, status: "ok" | "error", result? }`

**Why proxy via Next.js (not browser→connector direct):**
- Connector token stays server-side.
- No CORS configuration on the connector.
- Single env var exposed to the browser (`NEXT_PUBLIC_CONNECTOR_WS_URL`).

**This-round scope:** Overview subscribes to `tenants` and `integrations`
channels. Commands wired to integration list actions (e.g., "Sync now",
"Reconnect"). The 4 use-case pages are untouched.

### Note — React Doctor flagged pre-existing issues (deferred)

`npx react-doctor@latest` reported 4 warnings in files unrelated to the
connector work. These are pre-existing in files modified by the
`chore(cleanup)` commit, **not** regressions introduced by the
live-connector design.

| File | Rule | Confidence | Impact | Proposed fix |
|------|------|------------|--------|--------------|
| `components/Topbar.tsx:53` | `react-doctor/prefer-module-scope-static-value` — `refs` array rebuilt each render | high | breaks memoized children, extra work per render | hoist `refs` to module scope above the component |
| `components/Topbar.tsx:72` | `react-doctor/exhaustive-deps` — `useEffect` reads `refs` without listing it | high | effect can read stale `refs` | add `refs` to deps (or move logic into the event handler that needs it) |
| `components/ui/ConfirmDialog.tsx:32` | `react-doctor/no-event-handler` — event logic in `useEffect` | medium | extra render, runs late | move side effect into the click/keyboard handler that triggers it |
| `components/ui/Drawer.tsx:25` | `react-doctor/no-event-handler` — same pattern | medium | extra render, runs late | same fix as ConfirmDialog |

**Decision: deferred to a follow-up PR.** Per the React Doctor
guidance ("Split unrelated, broad, or behavior-changing work into
separate PRs/branches"), these are out of scope for the live-connector
work and will be tracked as GitHub issues when the project moves to a
repo with issue tracking. Note: the `react-hooks/exhaustive-deps`
eslint-disable comment in Topbar won't silence the `react-doctor/`
version — fix should use the correct rule name.

### Section 2 — Components & file layout (presented 2026-06-26, awaiting approval)

**New files:**

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

**Modified (1):** `app/page.tsx` — swap `data/integrations` and
`data/tenants` imports for `useConnector()`. Add ConnectionBanner at
top. No layout changes.

**Boundary principle:** `useConnector` is the only file that knows
there's a WebSocket. Consumers get typed data + functions. This is
what lets the next 4 use-case pages drop in as "swap mock for hook."

### Section 3 — Data flow & reconnect strategy (presented 2026-06-26, awaiting approval)

**State machine:** `DISCONNECTED → CONNECTING → CONNECTED → RECONNECTING ↔ STALE`

- STALE is separate from RECONNECTING — a connection can be open but
  the connector silent.
- Stale threshold: `2 × max(channel interval)`. Default 60s for the
  Overview subscriptions.
- Reconnect backoff: 1s, 2s, 4s, 8s, 16s, 30s (cap). Ref-tracked to
  avoid pile-up. Cleared on unmount.

**Subscription lifecycle:** on every CONNECTED, the hook re-sends
active subscriptions from a `useRef` Set. Per-channel state in
separate `useState` slices so a `tenants` update doesn't re-render
integration cards.

**Optimistic + ACK flow:**

1. `sendCommand` generates a uuid, optimistically mutates local state,
   stores a promise in `pendingCommands` Map, sends the WS message.
2. ACK `{id, status: "ok"}` → resolve, replace with server payload.
3. ACK `{id, status: "error"}` → reject, roll back, toast the error.
4. 10s timeout with no ACK → reject, roll back, toast "Connector didn't
   respond."

**Destructive actions** (restart_machine, isolate_machine) require a
`ConfirmDialog` click first; otherwise flow is identical.

**Mock mode:** `NEXT_PUBLIC_CONNECTOR_MOCK=1` (default until the real
connector ships) → `useConnector` runs `MockConnector` locally with
the same protocol, no WS at all. Mock → real is a one-line env swap.

### Section 4 — Error handling & edge cases (presented 2026-06-26, awaiting approval)

**Failure matrix** (detection → user-facing → auto-recovery):

| Failure | Detection | User-facing | Auto-recover |
|---------|-----------|-------------|--------------|
| WS upgrade fails | `onerror` pre-open | "Reconnecting…" | yes, backoff |
| WS drops mid-stream | `onclose` non-1000 | "Reconnecting… last Xm ago" | yes, backoff |
| 401/403 on upgrade | HTTP error | "Auth failed" terminal + sign-in button | no |
| Malformed JSON | `parseMessage` throws | console warn, drop | implicit |
| Unknown `op` | guard returns "unknown" | console warn, drop | implicit |
| State for unsubscribed channel | hook ignores | console warn | implicit |
| ACK for unknown id | map miss | console warn | implicit |
| 10s ACK timeout | per-command timer | toast, roll back | yes for state |
| Two browser tabs | separate WSs | both work independently | n/a |
| Page hidden | `visibilitychange` | keep WS open (default) | n/a |
| User navigates away | cleanup | close WS, reject pending | implicit |
| Server push contradicts optimistic | server push wins | console warn | implicit |

**Strict rules in `useConnector`:**

1. Server payload always wins.
2. Reconnect resets all in-flight optimistic state — no resend (would
   double-execute restart/isolate).
3. Backoff has ±20% jitter to prevent thundering herd across tabs.
4. Message rate cap 100/sec, drop + warn (protects from runaway
   server).
5. No silent failures — every drop logs `console.warn` with type and
   reason.

**Open question for user:** the "Auth failed" path. This app has no
sign-in route visible in the current file list. Is the dashboard
currently public, or is there an auth flow to wire into?

**User answer:** No auth — public dashboard. Proxy route trusts all
incoming requests; connector lives on a private network. The "Auth
failed" terminal state is kept in code (safe to enable later) but
unreachable in this design — no test cases for it.

### Section 5 — Testing (presented 2026-06-26, awaiting approval)

**Test files to add:**

- `lib/connector/protocol.test.ts` — parseMessage guards (well-formed,
  malformed JSON, unknown op, missing fields, wrong shapes).
- `lib/connector/useConnector.test.ts` — using a fake `WebSocket`:
  open/close on mount, subscribes on subscribe, state updates per
  channel, ignores unsubscribed channels, sendCommand/ack flow,
  10s timeout, reconnect + backoff schedule, rate cap 100/s, optimistic
  rollback on error and on timeout.
- `lib/connector/mockServer.test.ts` — emits state at intervals, ACKs
  commands, supports restart/isolate, simulates disconnect.
- `components/connector/ConnectionBanner.test.tsx` — Live /
  Reconnecting / Stale rendering with timestamps.
- `app/page.test.tsx` (new) — Overview renders cards + tenants from
  hook, ConnectionBanner present, Sync now → ConfirmDialog → sendCommand.
- `app/api/connector/ws/route.test.ts` — upgrade succeeds, token passed
  through, bytes proxied both ways.

**Coverage target:** 90%+ on `lib/connector/*`.

**Explicitly not tested:** real connector (doesn't exist), browser WS
quirks, visual regressions (no Chromatic/Playwright in this project).

---

## Design sign-off

| Section | Status                                      |
|---------|---------------------------------------------|
| 1. Architecture & data flow | Approved (turn before Section 2)            |
| 2. Components & file layout | Logged, awaiting your final sign-off         |
| 3. Data flow & reconnect    | Logged, awaiting your final sign-off         |
| 4. Error handling & edges   | Logged + auth decision (public dashboard)    |
| 5. Testing                  | Logged, awaiting your final sign-off         |

**Next steps once approved:**
1. Update this doc with any edits from the final review.
2. Write the formal spec to
   `docs/superpowers/specs/2026-06-26-live-api-integration-design.md`
   and commit it.
3. Hand off to the writing-plans skill for the implementation plan.

### Spec written, self-reviewed, committed (2026-06-26)

Spec committed at
`docs/superpowers/specs/2026-06-26-live-api-integration-design.md`
in two commits:
- `35bf403` — initial spec
- `4621c98` — self-review fixes (clarified §7 ACK semantics; §11.1
  fake-WS test approach)

**Self-review found and fixed 2 ambiguities:**
1. §7 — `sendCommand` rejects (does not throw) on error/timeout.
2. §11.1 — `useConnector` tests use a hand-rolled `FakeWebSocket` +
   `vi.useFakeTimers()`; no new lib dep.

**Near-miss logged:** first attempt at the self-review commit used
`git commit -am`, which swept in 11 pre-existing modified files
(including a 7999-line `package-lock.json` churn) along with the
spec. Caught via `git show --stat` immediately, soft-reset, re-staged
only the spec, recommitted clean. Lesson: use plain `git commit -m`
with explicit `git add` for the file(s) intended; never `-a` in this
repo while 11 unrelated files are in the working tree.

### Spec approved by user (2026-06-26)

User reviewed `docs/superpowers/specs/2026-06-26-live-api-integration-design.md`
and approved. Next: invoke the writing-plans skill to draft the
implementation plan.

### Plan written, self-reviewed, committed (2026-06-26)

Plan committed at
`docs/superpowers/plans/2026-06-26-live-api-connector.md`
(commit `20d3b46`). 12 tasks, all TDD with failing-test-first steps,
exact file paths, full code, expected outputs, and per-task commits.

**Self-review caught and fixed 3 issues inline:**
1. Task 9 imports: was `@/data/seed` (wrong), corrected to
   `@/data/tenants` and `@/data/integrations` (verified via
   `grep ^export data/seed.ts`).
2. Task 4 known timing caveat: was vague, tightened to spell out
   the `queueMicrotask` / `act()` interaction.
3. Task 7 `IntegrationStatusDot`: was unused in this round, now
   explicitly noted as a building block for the next round (use-case
   pages), not dead code.

**Lesson reinforced (lesson #2):** second time avoiding `git commit
-am`. Used plain `git commit -m` with explicit `git add` for the
plan file, then a second `git add howididit.md` for the log update.
Result: 2 files in the commit, 11 pre-existing files left in the
working tree, no sweep.

**Plan summary:**

| # | Task | Files |
|---|------|-------|
| 1 | Protocol types + parseMessage | `lib/connector/protocol.ts` |
| 2 | MockServer (in-process) | `lib/connector/mockServer.ts` |
| 3 | FakeWebSocket test helper | `lib/connector/__tests__/FakeWebSocket.ts` |
| 4 | useConnector hook | `lib/connector/useConnector.ts` |
| 5 | Public re-exports | `lib/connector/index.ts` |
| 6 | ConnectionBanner | `components/connector/ConnectionBanner.tsx` |
| 7 | IntegrationStatusDot (next round) | `components/connector/IntegrationStatusDot.tsx` |
| 8 | WS proxy route stub | `app/api/connector/ws/route.ts` |
| 9 | Wire Overview page | `app/page.tsx` |
| 10 | .env.example | `.env.example` |
| 11 | Custom Node server | `server.js`, `package.json` |
| 12 | Final verification | (no new files) |

### Execution phase: paused at user request (2026-06-26)

User chose "Full subagent-driven" then, on reflection, asked to stop
after the planning phase. The spec, plan, progress ledger, and skill
scripts are all set up and committed, so implementation can be picked
up later in a fresh session without losing context.

**What is committed and ready:**
- Spec: `docs/superpowers/specs/2026-06-26-live-api-integration-design.md`
- Plan: `docs/superpowers/plans/2026-06-26-live-api-connector.md`
- Progress ledger: `.superpowers/sdd/progress.md` (appended, not replaced)
- Project log: `howididit.md` (this file)

**To resume implementation later:**

```bash
# 1. Run the task-brief script for the next task:
bash .claude/plugins/cache/claude-plugins-official/superpowers/6.0.3/skills/subagent-driven-development/scripts/task-brief \
  docs/superpowers/plans/2026-06-26-live-api-connector.md <N>

# 2. Dispatch implementer subagent with the brief path.
# 3. Run review-package for the implementer's commit range.
# 4. Dispatch reviewer subagent.
# 5. Append to .superpowers/sdd/progress.md when review is clean.
# 6. Move to the next task.
```

The 12 tasks are independent and small enough to be picked up
individually. Task 1 (Protocol) is the natural starting point.

**Why I stopped:** three reasons in order of weight —
1. Session length + token cost. The subagent-driven path from here is
   24+ subagent dispatches minimum, each with its own context. The
   marginal value of one more yes-please-answer from me was low.
2. The 11 pre-existing modified files in the working tree make every
   commit a discipline test. Subagents slip on `git commit -am`
   despite the global constraint; you would have ended up reviewing
   a lot of fix loops.
3. You had not seen any of this code run yet. The first TDD red-green
   pass on the protocol types is the proof; that was a small inline
   step, not a subagent call.

**Open follow-ups (not blocking):**
- Confirm the exact connector channel names + payload shape with the
  MergeIT Connector team once the connector spec lands.
- Decide whether the 4 pre-existing React Doctor warnings in
  `components/Topbar.tsx`, `components/ui/ConfirmDialog.tsx`,
  `components/ui/Drawer.tsx` get a follow-up PR (deferred per
  earlier decision; see earlier section in this file).
- Verify Task 1's test against the `Tenant` / `Integration` types in
  `data/tenants.ts` and `data/integrations.ts` — the plan uses them
  implicitly via the hook, but the protocol layer is independent
  of those shapes.

### Plan SUPERSEDED by the real connector (2026-06-26)

User pointed at the actual connector:
`D:\projects\apiconnector\MergeIT-WazuhConnector`.

**Reality vs. plan:**

| Plan assumed | Connector actually has |
|--------------|------------------------|
| WebSocket transport | REST (Flask, no WS) |
| Custom `subscribe` / `state` / `cmd` / `ack` JSON protocol | Plain HTTP endpoints |
| Bidirectional commands (restart/isolate) | **Read-only API — no command endpoints** |
| Custom Node `ws` proxy + native WebSocket client | `fetch()` from browser or Next.js server route |
| 60s staleness threshold | Polling interval — REST has no push |
| Optimistic+ACK with 10s timeout | N/A; standard request/response |
| `useConnector` hook over WebSocket | `useSWR` / `useQuery` or hand-rolled `useEffect` + `fetch` |
| Public dashboard (no auth) | **Has auth**: `/authenticate`, `/customer/login`, `/customer/register` (JWT) |

- Task 3: server-only session cookie helpers. 3 tests passing.

**The connector endpoints that matter for the dashboard:**

| Endpoint | Used for |
|----------|----------|
| `POST /authenticate` | Admin sign-in (proxy to Wazuh) |
| `POST /customer/login` | Per-tenant customer sign-in |
| `POST /customer/register` | Self-serve customer onboarding |
| `GET /stats/agents?status=&tenant=` | The "Total agents" / "Endpoints (RMM)" KPIs |
| `GET /alerts?limit=&time_range=&tenant=` | The "Open incidents" / severity breakdown per tenant |
| `GET /tenants` | The "MSP fleet" tenant list |
| `GET /tenants/check?name=` | Registration flow validation |

**No command endpoints** — restart/isolate, "Sync now" etc. are not
implementable against this connector as it stands. The 5 use-case
pages lose those affordances until the connector grows them.

**User's decision:** redesign around the real REST API, throw out
the WebSocket transport, keep the JWT auth. This is the right call —
the WebSocket plan was an architectural guess that didn't survive
contact with the actual code.

**Next:** re-brainstorm with the connector's actual endpoint list in
hand. The spec/plan will be rewritten — same goals (live data on
Overview, then 5 use-case pages), different transport (REST + JWT +
polling), smaller scope (no commands yet).

### Connector updated (2026-06-26, mid-redesign)

User said the connector was updated. Re-read it:

**Change:** additive only. New endpoint `GET /agents/<agent_id>`
returns `{ agent: {...}, alerts: {...} }` (per-agent detail +
per-agent alerts). All other endpoints unchanged.

**Impact on the v2 spec/plan:** none. The new endpoint is per-agent
detail — that's a `/agents` use-case page concern, not the Overview
page. The Overview only uses `/tenants`, `/stats/agents`, `/alerts`
— all unchanged. v2 spec/plan still match.

**Open follow-up to add to the v2 spec:** the new
`GET /agents/<agent_id>` endpoint, for when the `/agents` use-case
page gets rewired in a later round. Not blocking v2.

### Execution: Task 1 done, stopped (2026-06-26)

Implemented Task 1 only (types + re-export files), committed as
`bbd3f3e`. Started Task 2 (wrote the test, ran vitest) but stopped
mid-task.

**Why I stopped:** the per-task cost in this session is higher than
I estimated. Every task in the v2 plan triggers a React Doctor
diagnostic dump on commit (~3KB each), and the plan has 17 tasks.
Combined with vitest noise and the 11 pre-existing modified files
in the working tree, the session was burning context fast on
work that the spec/plan already specifies verbatim.

**What's committed and ready to resume:**

| Commit | Content |
|---|---|
| `bbd3f3e` | Task 1: connector + auth types + re-exports |
| `298a224` | v2 plan (17 TDD tasks) |
| `e1ded70` | v2 spec + v1 supersede markers |
| `dc7300f`, `98586ac`, `dc8aa14` | howididit + paused notes |

**To resume Task 2 in a fresh session:**

```bash
cd D:/projects/dashboard
# Read the plan:
#   docs/superpowers/plans/2026-06-26-live-api-connector-rest.md
# Look at Task 2 (lib/connector/client.ts + __tests__/client.test.ts)
# The plan contains the full test code and the full implementation.
# The test file is already written (I wrote it before stopping); the
# implementation file is not. Just write the impl from the plan, run
# `npx vitest run lib/connector/__tests__/client.test.ts`, commit
# with explicit `git add` (never `git commit -am`).
```

**What I'd do differently if starting over:** I should have
predicted that the React Doctor dump + vitest noise + 17 small
commits would compound, and pushed back harder on the inline path
when the user picked it. The plan was solid; the execution cost
was always going to be 9+ small commits, each with its own context
cost. That's the kind of thing that's much better done by a fresh
subagent per task (clean context, full focus) or by hand in
shorter sessions.

The plan is honest about everything that needs doing. Resume
when ready.

### Task 2: connectorFetch server-only client (2026-06-26)

Implemented Task 2 from the v2 REST plan. Wrote
`lib/connector/client.ts` verbatim from the plan (server-only wrapper,
reads JWT cookie, adds Bearer, throws `ConnectorError` on non-2xx,
clears cookie on 401). Test file at
`lib/connector/__tests__/client.test.ts` was already on disk from
Task 2's red step.

- Task 2: connectorFetch server-only client. 5 tests passing.

---
- Task 2 fix: installed real `server-only` package; added test-shims/server-only.ts and vitest alias to make the import resolvable in vitest+jsdom (the real package throws on non-server import; the shim is a no-op for tests; build still uses the real package via bundler resolution). 5/5 still green.
- Task 4: /api/connector/auth/login route. Forwards to connector /authenticate, sets JWT cookie on 200. 4 tests passing.

- Task 5: /api/connector/auth/logout route. 1 test passing.
- Task 6: /api/connector/agents/count route. 4 tests passing.
- Task 7: /api/connector/alerts route. 2 tests passing.
- Task 8: /api/connector/tenants + /api/connector/health routes. 4 tests passing.
- Task 9: MSW handlers + mock data. tsc fails on msw (expected; resolves in Task 10).
- Task 10: msw 2.14.6 installed; browser + server mocks wired; vitest.setup.ts adds MSW server lifecycle; MockWorkerBoot client component starts MSW in dev when NEXT_PUBLIC_USE_MOCKS=1. 23/23 new tests pass (4 pre-existing Drawer.test failures are out of scope).
- Task 11: useConnectorStats hook (30s polling, 60s stale). 5 tests passing.
- Task 12: useConnectorAlerts hook (per-tenant, 30s polling). 5 tests passing.

- Task 13: useSession hook + /login page. 4 tests passing.
- Task 14: ConnectionBanner with 5 states. 5 tests passing.
- Task 15: app/page.tsx wired to live data (useConnectorStats + useConnectorAlerts + ConnectionBanner). 3 tests passing.

- Task 16: .env.example + AuthGate redirect. 3 tests passing.
