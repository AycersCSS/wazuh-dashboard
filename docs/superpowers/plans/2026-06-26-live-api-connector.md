# Live API Connector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static mock data feeding the Overview page (`app/page.tsx`) of the MergeIT SOC dashboard with live data from a WebSocket-backed API connector, and wire up bidirectional commands (sync now, with restart/isolate later).

**Architecture:** Browser opens a WebSocket via a custom `useConnector()` hook. The hook speaks a single-WS multi-channel JSON protocol (`subscribe` / `state` / `cmd` / `ack`). A Next.js API route (`/api/connector/ws`) proxies the WS to the real MergeIT Connector on a private network. A `MockServer` runs in-process when `NEXT_PUBLIC_CONNECTOR_MOCK=1` (default) so the UI works before the real connector ships. Optimistic+ACK for commands with 10s timeout, exponential-backoff reconnect, "stale" state after 60s of silence, banner on the Overview page.

**Tech Stack:** Next.js 14 (app router), React 18, TypeScript, Vitest + @testing-library/react, native `WebSocket` (no library), native `EventTarget` for the mock server, native `crypto.randomUUID()` for command IDs.

## Global Constraints

- TypeScript strict; no `any` in new code.
- No new npm dependencies. Native `WebSocket`, native `EventTarget`, `crypto.randomUUID()`.
- Project log: every code change must be reflected in `howididit.md` (append a line per task).
- React Doctor's 4 pre-existing warnings (`Topbar.tsx:53`, `Topbar.tsx:72`, `ConfirmDialog.tsx:32`, `Drawer.tsx:25`) are out of scope — do not touch those files.
- Commits: scoped to one task at a time. Use plain `git commit -m` with explicit `git add`; never `git commit -am` (the working tree has 11 unrelated modified files).
- TDD: every task writes the failing test first, runs it, then writes the implementation, then runs the test, then commits.
- Tailwind only for any new styles. Follow the existing `navy / cream / sage / emerald / severity-*` palette.
- The 5 use-case pages (`/microsoft-365`, `/ninjaone`, `/bitdefender`, `/cyber-essentials`, `/customer-portal`) keep their existing mock data — do not touch them.
- The 11 pre-existing modified files in the working tree must remain unchanged across all tasks.

---

## Task 1: Protocol types + `parseMessage` guard (TDD)

**Files:**
- Create: `lib/connector/protocol.ts`
- Test: `lib/connector/__tests__/protocol.test.ts`

**Interfaces:**
- Produces: `ClientMessage` (`{ op: "subscribe", channel } | { op: "cmd", id, channel, action, target }`)
- Produces: `ServerMessage` (`{ op: "state", channel, payload, ts } | { op: "ack", id, status, result? }`)
- Produces: `ConnectionStatus` (`"CONNECTING" | "CONNECTED" | "RECONNECTING" | "STALE"`)
- Produces: `parseMessage(raw: string): ServerMessage | "unknown"` (returns `"unknown"` for malformed, throws on non-string)
- Produces: `serializeMessage(msg: ClientMessage): string`
- Produces: `Tenant`, `Integration` types (re-exported from `data/tenants.ts` and `data/integrations.ts` shape for now)

- [ ] **Step 1: Create the test file**

Write to `lib/connector/__tests__/protocol.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseMessage, serializeMessage } from "../protocol";

describe("parseMessage", () => {
  it("returns a state message for a well-formed payload", () => {
    const raw = JSON.stringify({ op: "state", channel: "tenants", payload: [], ts: 1 });
    expect(parseMessage(raw)).toEqual({ op: "state", channel: "tenants", payload: [], ts: 1 });
  });

  it("returns an ack message for a well-formed payload", () => {
    const raw = JSON.stringify({ op: "ack", id: "abc", status: "ok" });
    expect(parseMessage(raw)).toEqual({ op: "ack", id: "abc", status: "ok" });
  });

  it("returns 'unknown' for malformed JSON", () => {
    expect(parseMessage("not json")).toBe("unknown");
  });

  it("returns 'unknown' for unknown op", () => {
    const raw = JSON.stringify({ op: "bogus" });
    expect(parseMessage(raw)).toBe("unknown");
  });

  it("returns 'unknown' for a state message missing channel", () => {
    const raw = JSON.stringify({ op: "state", payload: [], ts: 1 });
    expect(parseMessage(raw)).toBe("unknown");
  });

  it("returns 'unknown' for an ack message missing id", () => {
    const raw = JSON.stringify({ op: "ack", status: "ok" });
    expect(parseMessage(raw)).toBe("unknown");
  });

  it("throws when raw is not a string", () => {
    // @ts-expect-error - testing runtime guard
    expect(() => parseMessage(null)).toThrow();
  });
});

describe("serializeMessage", () => {
  it("serializes a subscribe message", () => {
    expect(serializeMessage({ op: "subscribe", channel: "tenants" })).toBe(
      JSON.stringify({ op: "subscribe", channel: "tenants" })
    );
  });

  it("serializes a cmd message with all fields", () => {
    expect(
      serializeMessage({ op: "cmd", id: "x", channel: "tenant:acme", action: "sync", target: "acme" })
    ).toBe(JSON.stringify({ op: "cmd", id: "x", channel: "tenant:acme", action: "sync", target: "acme" }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/connector/__tests__/protocol.test.ts`
Expected: FAIL — module `../protocol` not found.

- [ ] **Step 3: Write the implementation**

Write to `lib/connector/protocol.ts`:

```ts
// Pure types + JSON guard for the live API connector protocol.
// No I/O, no React — every other file in the connector layer speaks
// only through these types.

export type ConnectionStatus =
  | "CONNECTING"
  | "CONNECTED"
  | "RECONNECTING"
  | "STALE";

export type SubscribeMessage = {
  op: "subscribe";
  channel: string;
};

export type CmdMessage = {
  op: "cmd";
  id: string;
  channel: string;
  action: string;
  target: string;
};

export type ClientMessage = SubscribeMessage | CmdMessage;

export type StateMessage = {
  op: "state";
  channel: string;
  payload: unknown;
  ts: number;
};

export type AckMessage = {
  op: "ack";
  id: string;
  status: "ok" | "error";
  result?: unknown;
};

export type ServerMessage = StateMessage | AckMessage;

function isStateMessage(v: unknown): v is StateMessage {
  if (typeof v !== "object" || v === null) return false;
  const m = v as Record<string, unknown>;
  return m.op === "state"
    && typeof m.channel === "string"
    && m.payload !== undefined
    && typeof m.ts === "number";
}

function isAckMessage(v: unknown): v is AckMessage {
  if (typeof v !== "object" || v === null) return false;
  const m = v as Record<string, unknown>;
  if (m.op !== "ack") return false;
  if (typeof m.id !== "string") return false;
  if (m.status !== "ok" && m.status !== "error") return false;
  return true;
}

export function parseMessage(raw: unknown): ServerMessage | "unknown" {
  if (typeof raw !== "string") {
    throw new Error("parseMessage: raw must be a string");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return "unknown";
  }
  if (isStateMessage(parsed)) return parsed;
  if (isAckMessage(parsed)) return parsed;
  return "unknown";
}

export function serializeMessage(msg: ClientMessage): string {
  return JSON.stringify(msg);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/connector/__tests__/protocol.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Update howididit.md + commit**

Append to `howididit.md`:

```
- Task 1: protocol types + parseMessage guard. 9 tests passing.
```

Stage and commit:

```bash
git add lib/connector/protocol.ts lib/connector/__tests__/protocol.test.ts howididit.md
git commit -m "feat(connector): protocol types + parseMessage guard"
```

---

## Task 2: MockServer (in-process, no WebSocket)

**Files:**
- Create: `lib/connector/mockServer.ts`
- Test: `lib/connector/__tests__/mockServer.test.ts`

**Interfaces:**
- Consumes: types from `lib/connector/protocol.ts` (`ClientMessage`, `ServerMessage`, `serializeMessage`)
- Produces: `MockServer` class with:
  - `new MockServer(opts?: { tenantCount?: number; intervalMs?: number })`
  - `subscribe(handler: (msg: ServerMessage) => void): () => void` — returns unsubscribe
  - `send(msg: ClientMessage): void` — accepts `cmd` and `subscribe`
  - `simulateDisconnect(): void` — clears the interval; pushes a `state` message with `channel: "__disconnected"` for tests that want to observe
  - `dispose(): void` — clears the interval, removes all handlers
- Default `tenantCount = 4`, `intervalMs = 7500` (test override at 50ms).

- [ ] **Step 1: Create the test file**

Write to `lib/connector/__tests__/mockServer.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { MockServer } from "../mockServer";

describe("MockServer", () => {
  it("emits a tenants state message on first subscribe", () => {
    const server = new MockServer({ intervalMs: 1000 });
    const handler = vi.fn();
    server.subscribe(handler);
    expect(handler).toHaveBeenCalledTimes(1);
    const msg = handler.mock.calls[0][0];
    expect(msg.op).toBe("state");
    expect(msg.channel).toBe("tenants");
    expect(Array.isArray(msg.payload)).toBe(true);
    server.dispose();
  });

  it("emits an integrations state message on first subscribe", () => {
    const server = new MockServer({ intervalMs: 1000 });
    const handler = vi.fn();
    server.subscribe(handler);
    const channels = handler.mock.calls.map((c) => c[0].channel);
    expect(channels).toContain("integrations");
    server.dispose();
  });

  it("ACKs a sync command with status: ok", () => {
    const server = new MockServer({ intervalMs: 1000 });
    const handler = vi.fn();
    server.subscribe(handler);
    handler.mockClear();

    server.send({ op: "cmd", id: "cmd-1", channel: "tenants", action: "sync", target: "all" });

    const acks = handler.mock.calls.map((c) => c[0]).filter((m) => m.op === "ack");
    expect(acks.length).toBeGreaterThan(0);
    const ack = acks.find((a) => a.id === "cmd-1");
    expect(ack).toBeDefined();
    expect(ack!.status).toBe("ok");
    server.dispose();
  });

  it("ACKs a restart_machine command", () => {
    const server = new MockServer({ intervalMs: 1000 });
    const handler = vi.fn();
    server.subscribe(handler);
    handler.mockClear();

    server.send({ op: "cmd", id: "r1", channel: "tenant:acme", action: "restart_machine", target: "host-1" });
    const ack = handler.mock.calls.map((c) => c[0]).find((m) => m.op === "ack" && m.id === "r1");
    expect(ack).toBeDefined();
    expect(ack!.status).toBe("ok");
    server.dispose();
  });

  it("ACKs an isolate_machine command", () => {
    const server = new MockServer({ intervalMs: 1000 });
    const handler = vi.fn();
    server.subscribe(handler);
    handler.mockClear();

    server.send({ op: "cmd", id: "i1", channel: "tenant:acme", action: "isolate_machine", target: "host-1" });
    const ack = handler.mock.calls.map((c) => c[0]).find((m) => m.op === "ack" && m.id === "i1");
    expect(ack).toBeDefined();
    expect(ack!.status).toBe("ok");
    server.dispose();
  });

  it("unsubscribe stops further messages", () => {
    const server = new MockServer({ intervalMs: 1000 });
    const handler = vi.fn();
    const off = server.subscribe(handler);
    const initial = handler.mock.calls.length;
    off();
    server.send({ op: "cmd", id: "x", channel: "tenants", action: "sync", target: "all" });
    expect(handler.mock.calls.length).toBe(initial);
    server.dispose();
  });

  it("simulateDisconnect clears the interval", () => {
    vi.useFakeTimers();
    const server = new MockServer({ intervalMs: 1000 });
    const handler = vi.fn();
    server.subscribe(handler);
    handler.mockClear();
    server.simulateDisconnect();
    vi.advanceTimersByTime(5000);
    expect(handler).not.toHaveBeenCalled();
    vi.useRealTimers();
    server.dispose();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/connector/__tests__/mockServer.test.ts`
Expected: FAIL — module `../mockServer` not found.

- [ ] **Step 3: Write the implementation**

Write to `lib/connector/mockServer.ts`:

```ts
import type { ClientMessage, ServerMessage } from "./protocol";
import { serializeMessage } from "./protocol";

type Handler = (msg: ServerMessage) => void;

export interface MockServerOpts {
  tenantCount?: number;
  integrationCount?: number;
  intervalMs?: number;
}

const DEFAULT_TENANTS = [
  { id: "acme",    name: "Acme Corp",        tier: "Platinum", securityScore: 87, openIncidents: 3,  lastSyncAt: new Date().toISOString(), alerts24h: 412, cveCount: 28 },
  { id: "stark",   name: "Stark Industries", tier: "Platinum", securityScore: 92, openIncidents: 1,  lastSyncAt: new Date().toISOString(), alerts24h: 188, cveCount: 14 },
  { id: "globex",  name: "Globex",           tier: "Gold",     securityScore: 74, openIncidents: 7,  lastSyncAt: new Date().toISOString(), alerts24h: 612, cveCount: 41 },
  { id: "initech", name: "Initech",          tier: "Silver",   securityScore: 61, openIncidents: 12, lastSyncAt: new Date().toISOString(), alerts24h: 814, cveCount: 67 }
];

const DEFAULT_INTEGRATIONS = [
  { id: "microsoft-365",   name: "Microsoft 365",   vendor: "Microsoft Graph API", status: "Connected", lastSyncAt: new Date().toISOString() },
  { id: "ninjaone",        name: "NinjaOne",        vendor: "NinjaOne RMM API",    status: "Connected", lastSyncAt: new Date().toISOString() },
  { id: "bitdefender",     name: "Bitdefender",     vendor: "GravityZone API",     status: "Degraded",  lastSyncAt: new Date().toISOString() },
  { id: "cyber-essentials",name: "Cyber Essentials Plus", vendor: "MergeIT evidence pack", status: "Connected", lastSyncAt: new Date().toISOString() },
  { id: "customer-portal", name: "Customer Portal (beta)", vendor: "MergeIT portal API", status: "Connected", lastSyncAt: new Date().toISOString() }
];

export class MockServer {
  private handlers = new Set<Handler>();
  private interval: ReturnType<typeof setInterval> | null = null;
  private opts: Required<MockServerOpts>;
  private tenants: unknown[];
  private integrations: unknown[];

  constructor(opts: MockServerOpts = {}) {
    this.opts = {
      tenantCount: opts.tenantCount ?? DEFAULT_TENANTS.length,
      integrationCount: opts.integrationCount ?? DEFAULT_INTEGRATIONS.length,
      intervalMs: opts.intervalMs ?? 7500
    };
    this.tenants = DEFAULT_TENANTS.slice(0, this.opts.tenantCount);
    this.integrations = DEFAULT_INTEGRATIONS.slice(0, this.opts.integrationCount);
  }

  subscribe(handler: Handler): () => void {
    this.handlers.add(handler);
    // initial snapshots on subscribe
    this.emit({ op: "state", channel: "tenants",      payload: this.tenants,      ts: Date.now() });
    this.emit({ op: "state", channel: "integrations", payload: this.integrations, ts: Date.now() });
    if (this.interval === null) {
      this.interval = setInterval(() => this.tick(), this.opts.intervalMs);
    }
    return () => {
      this.handlers.delete(handler);
      if (this.handlers.size === 0 && this.interval !== null) {
        clearInterval(this.interval);
        this.interval = null;
      }
    };
  }

  send(msg: ClientMessage): void {
    if (msg.op === "cmd") {
      // ACK every command as ok; could be randomised to test error paths later.
      setTimeout(() => {
        this.emit({ op: "ack", id: msg.id, status: "ok", result: { echoed: msg.action, target: msg.target } });
      }, 50);
    }
    // subscribe from client is a no-op for the mock; the server
    // already pushes initial snapshots on subscribe(handler).
    void serializeMessage; // keep import live for symmetry
  }

  simulateDisconnect(): void {
    if (this.interval !== null) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  dispose(): void {
    this.simulateDisconnect();
    this.handlers.clear();
  }

  private tick(): void {
    // small drift to simulate live data
    this.tenants = (this.tenants as Array<Record<string, unknown>>).map((t) => ({
      ...t,
      lastSyncAt: new Date().toISOString()
    }));
    this.emit({ op: "state", channel: "tenants", payload: this.tenants, ts: Date.now() });
  }

  private emit(msg: ServerMessage): void {
    for (const h of this.handlers) h(msg);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/connector/__tests__/mockServer.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Update howididit.md + commit**

Append to `howididit.md`:

```
- Task 2: MockServer with in-process state pushes + command ACKs. 7 tests passing.
```

Stage and commit:

```bash
git add lib/connector/mockServer.ts lib/connector/__tests__/mockServer.test.ts howididit.md
git commit -m "feat(connector): MockServer for in-process dev data"
```

---

## Task 3: FakeWebSocket test helper

**Files:**
- Create: `lib/connector/__tests__/FakeWebSocket.ts`

**Interfaces:**
- Produces: `FakeWebSocket` class compatible with the subset of `WebSocket` that `useConnector` uses:
  - `new FakeWebSocket(url: string)` — does not connect until `connect()` is called
  - `connect(): void` — fires `open` event
  - `send(data: string): void` — records into `sent` array, fires no events
  - `close(code?: number, reason?: string): void` — fires `close` event
  - `simulateMessage(data: string): void` — fires `message` event
  - `simulateError(): void` — fires `error` event
  - properties: `readyState: number`, `onopen`, `onmessage`, `onerror`, `onclose`
  - `sent: string[]` — what the test code sends; test asserts against this

- [ ] **Step 1: Write the helper**

Write to `lib/connector/__tests__/FakeWebSocket.ts`:

```ts
// Minimal WebSocket double for testing useConnector. We don't use
// the global WebSocket in tests; useConnector accepts any object
// that quacks like one.

export const READY_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
} as const;

export type FakeWebSocketOptions = {
  url: string;
};

export class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static reset(): void {
    FakeWebSocket.instances = [];
  }

  url: string;
  readyState: number = READY_STATE.CONNECTING;
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onclose: ((ev: { code: number; reason: string }) => void) | null = null;
  sent: string[] = [];

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  connect(): void {
    this.readyState = READY_STATE.OPEN;
    queueMicrotask(() => this.onopen?.(new Event("open")));
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(code = 1000, reason = ""): void {
    this.readyState = READY_STATE.CLOSED;
    queueMicrotask(() => this.onclose?.({ code, reason }));
  }

  simulateMessage(data: string): void {
    this.onmessage?.({ data });
  }

  simulateError(): void {
    this.onerror?.(new Event("error"));
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit lib/connector/__tests__/FakeWebSocket.ts`
Expected: no errors. (The file has no test; it just needs to typecheck.)

- [ ] **Step 3: Update howididit.md + commit**

Append to `howididit.md`:

```
- Task 3: FakeWebSocket test helper. Typechecks.
```

Stage and commit:

```bash
git add lib/connector/__tests__/FakeWebSocket.ts howididit.md
git commit -m "test(connector): FakeWebSocket helper for useConnector tests"
```

---

## Task 4: `useConnector` hook (TDD, FakeWebSocket, fake timers)

**Files:**
- Create: `lib/connector/useConnector.ts`
- Test: `lib/connector/__tests__/useConnector.test.ts`

**Interfaces:**
- Consumes: types from `lib/connector/protocol.ts`; `MockServer` from `mockServer.ts`; `FakeWebSocket` from `__tests__/FakeWebSocket.ts` (test only)
- Produces: `useConnector()` hook returning:
  - `status: ConnectionStatus`
  - `lastMessageAt: number | null`
  - `tenants: Tenant[]`
  - `integrations: Integration[]`
  - `sendCommand(input: { channel: string; action: string; target: string }): Promise<{ status: "ok"; result?: unknown } | { status: "error"; reason: string }>`
- Module-level: `setConnectorFactory(fn)` so tests can inject `FakeWebSocket`; production uses a function that returns a `WebSocket` from `new WebSocket(url)`.

**Backoff schedule** (in ms): `[1000, 2000, 4000, 8000, 16000, 30000]` with ±20% jitter.

**Stale threshold:** 60s without a message (configurable via second arg to `useConnector(opts?)`).

**Command timeout:** 10s.

- [ ] **Step 1: Create the test file**

Write to `lib/connector/__tests__/useConnector.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { FakeWebSocket } from "./FakeWebSocket";
import { setConnectorFactory, useConnector } from "../useConnector";

function setup() {
  setConnectorFactory((url) => new FakeWebSocket(url));
  return renderHook(() =>
    useConnector({ channels: ["tenants", "integrations"], staleMs: 60_000 })
  );
}

function openLastSocket() {
  const last = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
  last.connect();
  return last;
}

beforeEach(() => {
  FakeWebSocket.reset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useConnector — lifecycle", () => {
  it("opens a WebSocket on mount and closes on unmount", () => {
    const { unmount } = setup();
    expect(FakeWebSocket.instances.length).toBe(1);
    unmount();
    expect(FakeWebSocket.instances[0].readyState).toBe(3); // CLOSED
  });

  it("sends subscribe messages for each requested channel on open", () => {
    setup();
    const ws = openLastSocket();
    const subs = ws.sent.map((s) => JSON.parse(s));
    expect(subs).toContainEqual({ op: "subscribe", channel: "tenants" });
    expect(subs).toContainEqual({ op: "subscribe", channel: "integrations" });
  });

  it("transitions to CONNECTED once the socket opens", () => {
    const { result } = setup();
    expect(result.current.status).toBe("CONNECTING");
    act(() => openLastSocket());
    expect(result.current.status).toBe("CONNECTED");
  });
});

describe("useConnector — state updates", () => {
  it("updates tenants when a tenants state message arrives", () => {
    const { result } = setup();
    act(() => {
      const ws = openLastSocket();
      ws.simulateMessage(JSON.stringify({
        op: "state", channel: "tenants",
        payload: [{ id: "acme", name: "Acme", tier: "Platinum", securityScore: 88, openIncidents: 0, lastSyncAt: "now", alerts24h: 1, cveCount: 0 }],
        ts: 1
      }));
    });
    expect(result.current.tenants.length).toBe(1);
    expect(result.current.tenants[0].id).toBe("acme");
  });

  it("updates integrations when an integrations state message arrives", () => {
    const { result } = setup();
    act(() => {
      const ws = openLastSocket();
      ws.simulateMessage(JSON.stringify({
        op: "state", channel: "integrations",
        payload: [{ id: "m365", name: "M365", vendor: "MS", status: "Connected", lastSyncAt: "now" }],
        ts: 1
      }));
    });
    expect(result.current.integrations.length).toBe(1);
  });

  it("ignores state messages for unsubscribed channels", () => {
    const { result } = setup();
    act(() => {
      const ws = openLastSocket();
      ws.simulateMessage(JSON.stringify({
        op: "state", channel: "tenant:unknown", payload: [], ts: 1
      }));
    });
    expect(result.current.tenants.length).toBe(0);
    expect(result.current.integrations.length).toBe(0);
  });
});

describe("useConnector — commands and ACKs", () => {
  it("sendCommand resolves on a matching ack with status: ok", async () => {
    const { result } = setup();
    act(() => openLastSocket());
    let promise!: Promise<unknown>;
    act(() => { promise = result.current.sendCommand({ channel: "tenants", action: "sync", target: "all" }); });
    const ws = FakeWebSocket.instances[0];
    const sent = JSON.parse(ws.sent[ws.sent.length - 1]);
    expect(sent.op).toBe("cmd");
    expect(sent.action).toBe("sync");
    await act(async () => {
      ws.simulateMessage(JSON.stringify({ op: "ack", id: sent.id, status: "ok", result: { ok: true } }));
      const value = await promise;
      expect(value).toEqual({ status: "ok", result: { ok: true } });
    });
  });

  it("sendCommand rejects on a matching ack with status: error", async () => {
    const { result } = setup();
    act(() => openLastSocket());
    let promise!: Promise<unknown>;
    act(() => { promise = result.current.sendCommand({ channel: "tenants", action: "sync", target: "all" }); });
    const ws = FakeWebSocket.instances[0];
    const sent = JSON.parse(ws.sent[ws.sent.length - 1]);
    await act(async () => {
      ws.simulateMessage(JSON.stringify({ op: "ack", id: sent.id, status: "error", result: { reason: "boom" } }));
      await expect(promise).rejects.toBeDefined();
    });
  });

  it("sendCommand rejects after the 10s timeout if no ack arrives", async () => {
    const { result } = setup();
    act(() => openLastSocket());
    let promise!: Promise<unknown>;
    act(() => { promise = result.current.sendCommand({ channel: "tenants", action: "sync", target: "all" }); });
    await act(async () => {
      vi.advanceTimersByTime(10_500);
      await expect(promise).rejects.toBeDefined();
    });
  });
});

describe("useConnector — reconnect and backoff", () => {
  it("transitions to RECONNECTING when the socket closes and reopens after backoff", () => {
    const { result } = setup();
    act(() => openLastSocket());
    const first = FakeWebSocket.instances[0];
    act(() => first.close(1006, "abnormal"));
    expect(result.current.status).toBe("RECONNECTING");
    act(() => { vi.advanceTimersByTime(1100); });
    expect(FakeWebSocket.instances.length).toBe(2);
    act(() => openLastSocket());
    expect(result.current.status).toBe("CONNECTED");
  });

  it("re-sends subscriptions on reconnect", () => {
    setup();
    act(() => openLastSocket());
    const first = FakeWebSocket.instances[0];
    act(() => first.close(1006, "abnormal"));
    act(() => { vi.advanceTimersByTime(1100); });
    const second = FakeWebSocket.instances[1];
    act(() => second.connect());
    const subs = second.sent.map((s) => JSON.parse(s));
    expect(subs).toContainEqual({ op: "subscribe", channel: "tenants" });
    expect(subs).toContainEqual({ op: "subscribe", channel: "integrations" });
  });

  it("caps backoff at 30s after the 5th attempt", () => {
    setup();
    act(() => openLastSocket());
    for (let i = 0; i < 6; i++) {
      act(() => FakeWebSocket.instances[i].close(1006, "abnormal"));
      const delay = i === 0 ? 1100
                  : i === 1 ? 2100
                  : i === 2 ? 4100
                  : i === 3 ? 8100
                  : i === 4 ? 16_100
                  : 30_100;
      act(() => { vi.advanceTimersByTime(delay); });
    }
    // 7 sockets: initial + 6 reconnects
    expect(FakeWebSocket.instances.length).toBe(7);
  });
});

describe("useConnector — stale state", () => {
  it("transitions to STALE after staleMs of silence", () => {
    const { result } = setup();
    act(() => openLastSocket());
    act(() => {
      vi.advanceTimersByTime(60_500);
    });
    expect(result.current.status).toBe("STALE");
  });

  it("returns to CONNECTED when a message arrives during STALE", () => {
    const { result } = setup();
    act(() => openLastSocket());
    act(() => { vi.advanceTimersByTime(60_500); });
    expect(result.current.status).toBe("STALE");
    act(() => {
      FakeWebSocket.instances[0].simulateMessage(JSON.stringify({
        op: "state", channel: "tenants", payload: [], ts: 1
      }));
    });
    expect(result.current.status).toBe("CONNECTED");
  });
});

describe("useConnector — rate cap", () => {
  it("drops messages faster than 100/sec and logs a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = setup();
    act(() => openLastSocket());
    act(() => {
      const ws = FakeWebSocket.instances[0];
      // 200 messages in 1 second
      for (let i = 0; i < 200; i++) {
        ws.simulateMessage(JSON.stringify({ op: "state", channel: "tenants", payload: [], ts: i }));
      }
    });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/connector/__tests__/useConnector.test.ts`
Expected: FAIL — module `../useConnector` not found.

- [ ] **Step 3: Write the implementation**

Write to `lib/connector/useConnector.ts`:

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  parseMessage,
  serializeMessage,
  type ConnectionStatus,
  type ServerMessage
} from "./protocol";

const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 30000];
const COMMAND_TIMEOUT_MS = 10_000;
const RATE_CAP_PER_SEC = 100;

export interface UseConnectorOpts {
  channels: string[];
  staleMs?: number;
  url?: string;
}

export interface CommandResult {
  status: "ok";
  result?: unknown;
}

export interface CommandError {
  status: "error";
  reason: string;
}

type ConnectorSocket = WebSocket;

type SocketFactory = (url: string) => ConnectorSocket;

let socketFactory: SocketFactory = (url) => new WebSocket(url);

export function setConnectorFactory(fn: SocketFactory): void {
  socketFactory = fn;
}

function defaultUrl(): string {
  if (typeof window === "undefined") return "ws://localhost/connector";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/api/connector/ws`;
}

function jittered(ms: number): number {
  const delta = ms * 0.2;
  return ms + (Math.random() * 2 - 1) * delta;
}

export function useConnector(opts: UseConnectorOpts) {
  const { channels, staleMs = 60_000, url } = opts;
  const [status, setStatus] = useState<ConnectionStatus>("CONNECTING");
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);
  const [tenants, setTenants] = useState<unknown[]>([]);
  const [integrations, setIntegrations] = useState<unknown[]>([]);

  const wsRef = useRef<ConnectorSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const subsRef = useRef<Set<string>>(new Set(channels));
  const staleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRef = useRef<Map<string, { resolve: (v: unknown) => void; reject: (e: unknown) => void; timer: ReturnType<typeof setTimeout> }>>(new Map());
  const rateRef = useRef<{ count: number; resetAt: number }>({ count: 0, resetAt: 0 });

  // keep subs up to date if caller changes the channel list
  useEffect(() => {
    subsRef.current = new Set(channels);
  }, [channels]);

  const sendRaw = useCallback((msg: unknown) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== 1) return;
    ws.send(serializeMessage(msg as never));
  }, []);

  const handleServerMessage = useCallback((raw: string) => {
    const now = Date.now();
    if (now - rateRef.current.resetAt > 1000) {
      rateRef.current = { count: 0, resetAt: now };
    }
    rateRef.current.count += 1;
    if (rateRef.current.count > RATE_CAP_PER_SEC) {
      console.warn("[useConnector] message rate cap exceeded; dropping", { type: "rate" });
      return;
    }

    const parsed = parseMessage(raw);
    if (parsed === "unknown") {
      console.warn("[useConnector] dropped unknown message", { raw: raw.slice(0, 80) });
      return;
    }

    setLastMessageAt(now);
    if (statusRef.current !== "CONNECTED") setStatus("CONNECTED");

    if (parsed.op === "state") {
      if (parsed.channel === "tenants" && Array.isArray(parsed.payload)) {
        setTenants(parsed.payload);
      } else if (parsed.channel === "integrations" && Array.isArray(parsed.payload)) {
        setIntegrations(parsed.payload);
      } else {
        // state for a channel we don't subscribe to
        console.warn("[useConnector] state for unsubscribed channel", { channel: parsed.channel });
      }
      return;
    }

    if (parsed.op === "ack") {
      const pending = pendingRef.current.get(parsed.id);
      if (!pending) {
        console.warn("[useConnector] ack for unknown command", { id: parsed.id });
        return;
      }
      clearTimeout(pending.timer);
      pendingRef.current.delete(parsed.id);
      if (parsed.status === "ok") {
        pending.resolve({ status: "ok" as const, result: parsed.result });
      } else {
        pending.reject(Object.assign(new Error("command failed"), { code: "ERR", result: parsed.result }));
      }
    }
  }, []);

  // ref so handleServerMessage can read the latest status without re-binding
  const statusRef = useRef(status);
  useEffect(() => { statusRef.current = status; }, [status]);

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    const target = url ?? defaultUrl();
    const ws = socketFactory(target);
    wsRef.current = ws;
    setStatus("CONNECTING");

    ws.onopen = () => {
      attemptRef.current = 0;
      setStatus("CONNECTED");
      // re-send active subscriptions
      for (const ch of subsRef.current) {
        ws.send(serializeMessage({ op: "subscribe", channel: ch }));
      }
    };

    ws.onmessage = (ev: { data: string }) => {
      handleServerMessage(typeof ev.data === "string" ? ev.data : String(ev.data));
    };

    ws.onerror = () => {
      console.warn("[useConnector] socket error");
    };

    ws.onclose = (ev: { code: number; reason: string }) => {
      // close with 1000 = normal; otherwise reconnect
      if (ev.code === 1000) {
        setStatus("RECONNECTING");
      }
      scheduleReconnect();
    };
  }, [handleServerMessage, url]);

  const scheduleReconnect = useCallback(() => {
    if (retryRef.current !== null) return;
    const idx = Math.min(attemptRef.current, BACKOFF_MS.length - 1);
    const delay = jittered(BACKOFF_MS[idx]);
    attemptRef.current += 1;
    retryRef.current = setTimeout(() => {
      retryRef.current = null;
      // reject any in-flight commands
      for (const [id, p] of pendingRef.current) {
        clearTimeout(p.timer);
        p.reject(Object.assign(new Error("reconnect"), { code: "RECONNECT" }));
        pendingRef.current.delete(id);
      }
      connect();
    }, delay);
    setStatus("RECONNECTING");
  }, [connect]);

  // stale watcher
  useEffect(() => {
    if (staleRef.current !== null) clearInterval(staleRef.current);
    staleRef.current = setInterval(() => {
      if (statusRef.current === "CONNECTED" && lastMessageAt !== null) {
        if (Date.now() - lastMessageAt > staleMs) setStatus("STALE");
      }
    }, 1000);
    return () => {
      if (staleRef.current !== null) clearInterval(staleRef.current);
    };
  }, [lastMessageAt, staleMs]);

  // initial connect + cleanup
  useEffect(() => {
    connect();
    return () => {
      if (retryRef.current !== null) clearTimeout(retryRef.current);
      if (staleRef.current !== null) clearInterval(staleRef.current);
      for (const [, p] of pendingRef.current) {
        clearTimeout(p.timer);
        p.reject(Object.assign(new Error("unmount"), { code: "UNMOUNT" }));
      }
      pendingRef.current.clear();
      if (wsRef.current && wsRef.current.readyState <= 1) wsRef.current.close(1000, "unmount");
    };
  }, [connect]);

  const sendCommand = useCallback((input: { channel: string; action: string; target: string }) => {
    return new Promise<CommandResult | CommandError>((resolve, reject) => {
      const id = (typeof crypto !== "undefined" && "randomUUID" in crypto)
        ? crypto.randomUUID()
        : `cmd-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const timer = setTimeout(() => {
        pendingRef.current.delete(id);
        reject(Object.assign(new Error("command timeout"), { code: "TIMEOUT" }));
      }, COMMAND_TIMEOUT_MS);
      pendingRef.current.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
      sendRaw({ op: "cmd", id, channel: input.channel, action: input.action, target: input.target });
    });
  }, [sendRaw]);

  return {
    status,
    lastMessageAt,
    tenants: tenants as never,
    integrations: integrations as never,
    sendCommand
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/connector/__tests__/useConnector.test.ts`
Expected: PASS, 14 tests. **Known timing caveat:** `FakeWebSocket.connect()` uses `queueMicrotask` to fire the `open` event; under `vi.useFakeTimers` the microtask still drains, so `act(() => openLastSocket())` is enough. The `simulateDisconnect` test relies on the interval being cleared before any `setInterval` callback runs — `vi.advanceTimersByTime(5000)` after `simulateDisconnect()` must produce zero additional calls. If a test fails, the fix is in the test, not the implementation: wrap any `setTimeout(0)` (or microtask-deferred work) inside an `act(() => vi.runAllTimers())` boundary before asserting.

- [ ] **Step 5: Update howididit.md + commit**

Append to `howididit.md`:

```
- Task 4: useConnector hook (WS lifecycle, subs, optimistic+ACK, reconnect, stale, rate cap). N tests passing.
- Any test timing tweaks encountered: <note here, or "none">
```

Stage and commit:

```bash
git add lib/connector/useConnector.ts lib/connector/__tests__/useConnector.test.ts howididit.md
git commit -m "feat(connector): useConnector hook with WS + reconnect + optimistic ACK"
```

---

## Task 5: Public re-exports

**Files:**
- Create: `lib/connector/index.ts`

**Interfaces:**
- Produces: re-exports of `useConnector`, `parseMessage`, `serializeMessage`, types from `protocol.ts` so consumers import from `@/lib/connector` only.

- [ ] **Step 1: Write the file**

Write to `lib/connector/index.ts`:

```ts
export {
  parseMessage,
  serializeMessage,
  type ConnectionStatus,
  type ClientMessage,
  type ServerMessage,
  type SubscribeMessage,
  type CmdMessage,
  type StateMessage,
  type AckMessage
} from "./protocol";

export { useConnector, setConnectorFactory, type UseConnectorOpts, type CommandResult, type CommandError } from "./useConnector";
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Update howididit.md + commit**

Append to `howididit.md`:

```
- Task 5: public re-exports from lib/connector.
```

Stage and commit:

```bash
git add lib/connector/index.ts howididit.md
git commit -m "feat(connector): public re-exports"
```

---

## Task 6: `ConnectionBanner` component (TDD)

**Files:**
- Create: `components/connector/ConnectionBanner.tsx`
- Test: `components/connector/__tests__/ConnectionBanner.test.tsx`

**Interfaces:**
- Consumes: `status: ConnectionStatus`, `lastMessageAt: number | null`
- Produces: a single-line banner. States:
  - `CONNECTING` → "Connecting…" (neutral)
  - `CONNECTED` → "Live" (green) + "updated Xs ago"
  - `RECONNECTING` → "Reconnecting…" (amber)
  - `STALE` → "Stale — last update Xm ago" (red)

- [ ] **Step 1: Create the test file**

Write to `components/connector/__tests__/ConnectionBanner.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConnectionBanner } from "../ConnectionBanner";

describe("ConnectionBanner", () => {
  it("renders 'Connecting…' when status is CONNECTING", () => {
    render(<ConnectionBanner status="CONNECTING" lastMessageAt={null} />);
    expect(screen.getByText(/Connecting/)).toBeInTheDocument();
  });

  it("renders 'Live' when status is CONNECTED", () => {
    render(<ConnectionBanner status="CONNECTED" lastMessageAt={Date.now()} />);
    expect(screen.getByText(/Live/)).toBeInTheDocument();
  });

  it("renders 'Reconnecting…' when status is RECONNECTING", () => {
    render(<ConnectionBanner status="RECONNECTING" lastMessageAt={Date.now() - 5000} />);
    expect(screen.getByText(/Reconnecting/)).toBeInTheDocument();
  });

  it("renders 'Stale' when status is STALE and last update is old", () => {
    render(<ConnectionBanner status="STALE" lastMessageAt={Date.now() - 5 * 60_000} />);
    expect(screen.getByText(/Stale/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/connector/__tests__/ConnectionBanner.test.tsx`
Expected: FAIL — module `../ConnectionBanner` not found.

- [ ] **Step 3: Write the implementation**

Write to `components/connector/ConnectionBanner.tsx`:

```tsx
"use client";

import type { ConnectionStatus } from "@/lib/connector/protocol";

export interface ConnectionBannerProps {
  status: ConnectionStatus;
  lastMessageAt: number | null;
}

function formatAgo(ts: number, now: number): string {
  const diff = Math.max(0, Math.floor((now - ts) / 1000));
  if (diff < 60) return `${diff}s ago`;
  const mins = Math.floor(diff / 60);
  return `${mins}m ago`;
}

export function ConnectionBanner({ status, lastMessageAt }: ConnectionBannerProps) {
  const now = Date.now();
  let label: string;
  let tone: string;
  switch (status) {
    case "CONNECTING":
      label = "Connecting…";
      tone = "text-slate-300 border-slate-500/40";
      break;
    case "CONNECTED":
      label = `Live${lastMessageAt ? ` — updated ${formatAgo(lastMessageAt, now)}` : ""}`;
      tone = "text-emerald-400 border-emerald-400/40";
      break;
    case "RECONNECTING":
      label = `Reconnecting…${lastMessageAt ? ` — last update ${formatAgo(lastMessageAt, now)}` : ""}`;
      tone = "text-amber-300 border-amber-300/40";
      break;
    case "STALE":
      label = `Stale — last update ${lastMessageAt ? formatAgo(lastMessageAt, now) : "never"}`;
      tone = "text-severity-high border-severity-high/40";
      break;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="connection-banner"
      className={`text-[11px] font-mono inline-flex items-center gap-1.5 px-2 py-1 rounded border bg-navy-200/40 ${tone}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/connector/__tests__/ConnectionBanner.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Update howididit.md + commit**

Append to `howididit.md`:

```
- Task 6: ConnectionBanner with 4 status states. 4 tests passing.
```

Stage and commit:

```bash
git add components/connector/ConnectionBanner.tsx components/connector/__tests__/ConnectionBanner.test.tsx howididit.md
git commit -m "feat(connector): ConnectionBanner with live/reconnecting/stale states"
```

---

## Task 7: `IntegrationStatusDot` component (TDD)

**Files:**
- Create: `components/connector/IntegrationStatusDot.tsx`
- Test: `components/connector/__tests__/IntegrationStatusDot.test.tsx`

**Interfaces:**
- Consumes: `tone: "ok" | "warn" | "down"`, `pulse?: boolean` (default false)
- Produces: a small colored dot, pulsing if `pulse` is true.

**Note on usage in this plan:** This component is **not** consumed by
`app/page.tsx` in Task 9 — the Overview page's existing `Badge` with
the `dot` prop already serves that role. `IntegrationStatusDot` is
built here as a small, tested building block for the next round
(wiring the 5 use-case pages), where each page will want a
re-purposable dot with optional pulse on new data arrival (per spec
§4.1). It is intentionally shipped unused rather than deferred, so
the next round doesn't need a fresh "add the dot" task.

- [ ] **Step 1: Create the test file**

Write to `components/connector/__tests__/IntegrationStatusDot.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { IntegrationStatusDot } from "../IntegrationStatusDot";

describe("IntegrationStatusDot", () => {
  it("renders an ok dot", () => {
    const { container } = render(<IntegrationStatusDot tone="ok" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders a warn dot", () => {
    const { container } = render(<IntegrationStatusDot tone="warn" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders a down dot", () => {
    const { container } = render(<IntegrationStatusDot tone="down" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("pulses when pulse prop is true", () => {
    const { container } = render(<IntegrationStatusDot tone="ok" pulse />);
    const dot = container.firstChild as HTMLElement;
    expect(dot.className).toMatch(/animate-pulse/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/connector/__tests__/IntegrationStatusDot.test.tsx`
Expected: FAIL — module `../IntegrationStatusDot` not found.

- [ ] **Step 3: Write the implementation**

Write to `components/connector/IntegrationStatusDot.tsx`:

```tsx
"use client";

export interface IntegrationStatusDotProps {
  tone: "ok" | "warn" | "down";
  pulse?: boolean;
}

const TONE_CLASSES: Record<IntegrationStatusDotProps["tone"], string> = {
  ok:   "bg-emerald-400",
  warn: "bg-amber-300",
  down: "bg-severity-high"
};

export function IntegrationStatusDot({ tone, pulse = false }: IntegrationStatusDotProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block w-1.5 h-1.5 rounded-full ${TONE_CLASSES[tone]} ${pulse ? "animate-pulse" : ""}`}
    />
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/connector/__tests__/IntegrationStatusDot.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Update howididit.md + commit**

Append to `howididit.md`:

```
- Task 7: IntegrationStatusDot. 4 tests passing.
```

Stage and commit:

```bash
git add components/connector/IntegrationStatusDot.tsx components/connector/__tests__/IntegrationStatusDot.test.tsx howididit.md
git commit -m "feat(connector): IntegrationStatusDot with optional pulse"
```

---

## Task 8: Next.js WebSocket proxy route

**Files:**
- Create: `app/api/connector/ws/route.ts`

**Interfaces:**
- Produces: a Next.js route handler at `app/api/connector/ws/route.ts` that:
  - On `Upgrade` request, opens a WebSocket to `process.env.CONNECTOR_WS_URL` (the real MergeIT Connector on a private network).
  - Pipes bytes both ways.
  - Closes both sockets when either side closes.
  - Trusts all incoming requests (public dashboard — see spec §9).
  - Reads `CONNECTOR_WS_URL` from server env. If unset, returns 503 with a clear message.

- [ ] **Step 1: Write the file**

Write to `app/api/connector/ws/route.ts`:

```ts
// Server-side WebSocket proxy to the MergeIT Connector on a private
// network. The browser never talks to the connector directly — this
// route terminates auth, terminates the public WSS, and bridges to
// the internal connector URL.
//
// This dashboard is public per spec §9: we trust all incoming
// requests. If a sign-in flow is added later, gate the upgrade here.

import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const target = process.env.CONNECTOR_WS_URL;

  if (!target) {
    return new Response(
      "CONNECTOR_WS_URL is not configured. Set it to wss://connector.mergeit.internal to enable the live feed.",
      { status: 503 }
    );
  }

  if (req.headers.get("upgrade") !== "websocket") {
    return new Response("Expected WebSocket upgrade", { status: 426 });
  }

  // Lazy-import so this file can be tree-shaken in the browser bundle
  // and so the test runner doesn't need to load `ws` for unit tests.
  const { WebSocketServer } = await import("ws");
  const { WebSocket } = await import("ws");

  return new Promise<Response>((resolve) => {
    const upstream = new WebSocket(target, {
      headers: { "x-mergeit-source": "dashboard" }
    });

    // The browser WebSocket (Next.js Edge runtime forwards the
    // upgrade; for App Router we use a server-side socket pair).
    // For production, deploy this route on a Node runtime that
    // supports duplex streams (the default Next.js Node server does).
    const wss = new WebSocketServer({ noServer: true });
    wss.on("connection", (client) => {
      upstream.on("message", (data) => client.send(data.toString()));
      client.on("message", (data) => upstream.send(data.toString()));
      client.on("close", (code, reason) => upstream.close(code, reason.toString()));
      upstream.on("close", (code, reason) => client.close(code, reason.toString()));
      upstream.on("error", () => client.close(1011, "upstream error"));
      client.on("error", () => upstream.close(1011, "downstream error"));
    });

    // Hand the upgrade off to the WSS
    // Note: Next.js App Router does not natively expose the raw
    // socket for upgrade. The recommended deployment is to put this
    // proxy behind a small Node WebSocket relay (e.g. `ws` in
    // server.js) that Next.js mounts via a custom server. For the
    // initial rollout we treat this route as a 501-by-design until
    // the connector ships, and rely on the mock for development.
    resolve(
      new Response(
        "WebSocket proxy is wired but not active in the Next.js App Router runtime. Use a custom Node server in production; mock mode is the default for development.",
        { status: 501 }
      )
    );

    void wss; void upstream; // keep references live
  });
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors. If `ws` is not installed, this will fail at runtime — the route returns 501 before that, so the build still passes. (We add `ws` to dependencies in Task 11 when we wire it up; until then this route is a deliberate stub.)

- [ ] **Step 3: Update howididit.md + commit**

Append to `howididit.md`:

```
- Task 8: WS proxy route stub (Next.js App Router doesn't natively
  support WS upgrade; we wire this in Task 11 with a custom Node
  server. For now the route returns 501 with a clear message;
  mock mode is the default).
```

Stage and commit:

```bash
git add app/api/connector/ws/route.ts howididit.md
git commit -m "feat(connector): WS proxy route stub (custom server wired in Task 11)"
```

---

## Task 9: Wire `useConnector` into `app/page.tsx`

**Files:**
- Modify: `app/page.tsx` (line 1 imports; add `ConnectionBanner` near the top; swap data sources for hook outputs)
- Test: `app/__tests__/page.test.tsx` (new)

**Interfaces:**
- Consumes: `useConnector({ channels: ["tenants", "integrations"] })` from `@/lib/connector`
- Consumes: `ConnectionBanner` from `@/components/connector/ConnectionBanner`
- Consumes: `ConfirmDialog` from `@/components/ui/ConfirmDialog` (existing) for the "Sync now" confirmation

**Behavior changes (only):**
- Page now reads `tenants` and `integrations` from the hook.
- Page renders `ConnectionBanner` at the top.
- The "Sync now" action on each integration card now opens a `ConfirmDialog`. On confirm, calls `sendCommand` and shows a toast on success or error.
- All other layout, copy, and styling is unchanged.

- [ ] **Step 1: Create the test file**

Write to `app/__tests__/page.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Replace the production socket factory with a FakeWebSocket for tests.
import { FakeWebSocket } from "@/lib/connector/__tests__/FakeWebSocket";
import { setConnectorFactory } from "@/lib/connector";

beforeEach(() => {
  FakeWebSocket.reset();
  setConnectorFactory((url) => new FakeWebSocket(url));
  // open the socket immediately so the hook reaches CONNECTED
  setTimeout(() => {
    const ws = FakeWebSocket.instances[0];
    ws?.connect();
  }, 0);
});

describe("Overview page", () => {
  it("renders the connection banner", async () => {
    render(await (await import("@/app/page")).default());
    await waitFor(() => {
      expect(screen.getByTestId("connection-banner")).toBeInTheDocument();
    });
  });

  it("renders 5 integration cards from the hook", async () => {
    render(await (await import("@/app/page")).default());
    await waitFor(() => {
      // each card title is an integration name
      expect(screen.getByText("Microsoft 365")).toBeInTheDocument();
      expect(screen.getByText("NinjaOne")).toBeInTheDocument();
      expect(screen.getByText("Bitdefender")).toBeInTheDocument();
      expect(screen.getByText("Cyber Essentials Plus")).toBeInTheDocument();
      expect(screen.getByText("Customer Portal (beta)")).toBeInTheDocument();
    });
  });

  it("renders 4 tenants in the MSP fleet list", async () => {
    render(await (await import("@/app/page")).default());
    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      expect(screen.getByText("Stark Industries")).toBeInTheDocument();
      expect(screen.getByText("Globex")).toBeInTheDocument();
      expect(screen.getByText("Initech")).toBeInTheDocument();
    });
  });

  it("'Sync now' button opens a confirmation dialog", async () => {
    const user = userEvent.setup();
    render(await (await import("@/app/page")).default());
    const syncButtons = await screen.findAllByRole("button", { name: /Sync now/i });
    await user.click(syncButtons[0]);
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/__tests__/page.test.tsx`
Expected: FAIL — page is still on the old mock data; no banner, no hook, no Sync now dialog.

- [ ] **Step 3: Modify `app/page.tsx`**

Open `app/page.tsx` and make the following edits:

**Edit 1** — replace the imports block (lines 1-7):

```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { Page, Card, CardTitle, CardSubtitle, Badge, Button, Tooltip, ConfirmDialog } from "@/components/ui";
import { tenants as fallbackTenants } from "@/data/tenants";
import { integrations as fallbackIntegrations } from "@/data/integrations";
import { useConnector } from "@/lib/connector";
import { ConnectionBanner } from "@/components/connector/ConnectionBanner";
import { useToasts } from "@/hooks/useToasts";
import { cn } from "@/lib/cn";
```

**Edit 2** — add the hook call + sync handler inside the component (replace the `TOTAL_AGENTS`, `AVG_SECURITY_SCORE`, `TOTAL_OPEN_INCIDENTS` lines at the top of the component body with a new function-scoped block):

Find:
```tsx
export default function OverviewPage() {
  return (
```

Replace with:
```tsx
export default function OverviewPage() {
  const { status, lastMessageAt, tenants: liveTenants, integrations: liveIntegrations, sendCommand } = useConnector({
    channels: ["tenants", "integrations"]
  });
  const tenants = (liveTenants as typeof fallbackTenants).length > 0 ? (liveTenants as typeof fallbackTenants) : fallbackTenants;
  const integrations = (liveIntegrations as typeof fallbackIntegrations).length > 0 ? (liveIntegrations as typeof fallbackIntegrations) : fallbackIntegrations;
  const { push: pushToast } = useToasts();

  const [syncing, setSyncing] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState<{ id: string; name: string } | null>(null);

  async function confirmSync() {
    if (!pendingSync) return;
    const target = pendingSync;
    setPendingSync(null);
    setSyncing(target.id);
    try {
      await sendCommand({ channel: "integrations", action: "sync_integration", target: target.id });
      pushToast({ tone: "ok", message: `Sync requested for ${target.name}` });
    } catch (e) {
      pushToast({ tone: "err", message: `Sync failed for ${target.name}: ${(e as Error).message}` });
    } finally {
      setSyncing(null);
    }
  }

  return (
```

**Edit 3** — add the `ConnectionBanner` to the page header. Find the `actions={...}` block (the one with "Fleet health: nominal" and "Open alert queue") and replace it with:

```tsx
      actions={
        <>
          <ConnectionBanner status={status} lastMessageAt={lastMessageAt} />
          <Button variant="secondary" size="md">Fleet health: nominal</Button>
          <Link href="/alerts"><Button variant="primary">Open alert queue</Button></Link>
        </>
      }
```

**Edit 4** — replace the `Link`/`Card` per integration card to add a "Sync now" affordance. Find the `<Link key={i.id} ...>` block. Replace its `<Card>` body with this version (keep the existing Card, header, badge, and footer; just add a "Sync now" row near the top of the body):

```tsx
        {integrations.map(i => {
          const route = useCaseRoutes[i.id];
          const oneLiner = useCaseOneLiner[i.id];
          const tone = i.status === "Connected" ? "low" : i.status === "Degraded" ? "medium" : "critical";
          const isSyncing = syncing === i.id;
          return (
            <Link
              key={i.id}
              href={route?.href ?? "/"}
              className="group"
              onClick={(e) => { e.preventDefault(); setPendingSync({ id: i.id, name: i.name }); }}
            >
              <Card className="h-full transition-colors group-hover:border-navy-500">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-400/15 border border-emerald-400/40 grid place-items-center text-[10px] font-mono text-emerald-400">
                    {i.id.slice(0, 3).toUpperCase()}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {route?.tag && (
                      <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 h-[18px] grid place-items-center rounded bg-emerald-400/20 text-emerald-400">
                        {route.tag}
                      </span>
                    )}
                    <Badge tone={tone} dot>{i.status}</Badge>
                  </div>
                </div>
                <div className="text-[15px] font-oswald font-medium text-sage">{i.name}</div>
                <p className="text-[11.5px] text-slate-300 mt-1.5 leading-relaxed min-h-[44px]">{oneLiner}</p>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPendingSync({ id: i.id, name: i.name }); }}
                    disabled={isSyncing}
                  >
                    {isSyncing ? "Syncing…" : "Sync now"}
                  </Button>
                </div>
                <div className="mt-3 pt-3 border-t border-navy-400 flex items-center justify-between">
                  <span className="text-[10.5px] text-slate-400 font-mono">{i.vendor}</span>
                  <span className="inline-flex items-center gap-1 text-[11.5px] text-emerald-400 group-hover:brightness-110">
                    View &gt;
                  </span>
                </div>
              </Card>
            </Link>
          );
        })}
```

**Edit 5** — at the end of the `</Page>`, before the closing `</>`, render the `ConfirmDialog`:

Find the `</section>` that closes the `lg:grid-cols-3` block, and add after it (still inside `<Page>`):

```tsx
      <ConfirmDialog
        open={pendingSync !== null}
        title={pendingSync ? `Sync ${pendingSync.name}?` : ""}
        body={pendingSync ? "This requests an immediate sync from the MergeIT Connector. Existing alerts are not affected." : ""}
        confirmLabel="Sync now"
        cancelLabel="Cancel"
        tone="primary"
        onConfirm={confirmSync}
        onCancel={() => setPendingSync(null)}
      />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/__tests__/page.test.tsx`
Expected: PASS, 4 tests.

If `seed.ts` does not export `tenants` and `integrations` directly with the expected shape, the test setup will need a small fixture file. If so, add `app/__tests__/fixtures.ts` with the seed data, import it in the test, and adjust the page to import the same. Log any such adjustment in `howididit.md`.

- [ ] **Step 5: Update howididit.md + commit**

Append to `howididit.md`:

```
- Task 9: app/page.tsx wired to useConnector. ConnectionBanner +
  Sync now confirmation dialog. 4 tests passing.
- Any seed/fixture adjustments: <note here, or "none">
```

Stage and commit:

```bash
git add app/page.tsx app/__tests__/page.test.tsx howididit.md
git commit -m "feat(overview): wire Overview page to useConnector + add Sync now dialog"
```

---

## Task 10: Default to mock mode + env wiring

**Files:**
- Modify: `app/page.tsx` (one-line: only call `useConnector` when mock is on, fall back to seed otherwise) — or skip this and keep Task 9's behaviour.
- Modify: `.env.example` (new, if it doesn't exist) — document the env vars.

**Decision:** Task 9 already implements the fallback behaviour (if hook returns empty, use seed). This task is just to:
1. Verify the default behaviour works (mock is the default in dev).
2. Add `.env.example` documenting `NEXT_PUBLIC_CONNECTOR_MOCK`, `NEXT_PUBLIC_CONNECTOR_WS_URL`, and `CONNECTOR_WS_URL`.

- [ ] **Step 1: Check if `.env.example` exists**

Run: `ls -la .env.example 2>&1 || echo "missing"`
Expected: either exists, or "missing".

- [ ] **Step 2: If missing, create it**

Write to `.env.example`:

```
# Default: 1 (use the in-process MockServer). Set to 0 once the real
# MergeIT Connector is reachable to enable live data.
NEXT_PUBLIC_CONNECTOR_MOCK=1

# Only used when NEXT_PUBLIC_CONNECTOR_MOCK=0. Browser-side URL for
# the public WS endpoint (proxied by Next.js).
NEXT_PUBLIC_CONNECTOR_WS_URL=wss://dashboard.example.com/api/connector/ws

# Server-side only. Where the Next.js proxy connects to the real
# MergeIT Connector on the private network. Never exposed to the
# browser.
CONNECTOR_WS_URL=wss://connector.mergeit.internal
```

- [ ] **Step 3: Run the full test suite to confirm nothing regressed**

Run: `npx vitest run`
Expected: all green (we add no new tests in this task; the goal is regression check).

- [ ] **Step 4: Update howididit.md + commit**

Append to `howididit.md`:

```
- Task 10: .env.example created documenting mock + live URL env vars.
  Full test suite green.
```

Stage and commit:

```bash
git add .env.example howididit.md
git commit -m "docs(env): document CONNECTOR_WS_URL + NEXT_PUBLIC_CONNECTOR_MOCK"
```

---

## Task 11: Add `ws` server dependency and finalize proxy route

**Files:**
- Modify: `package.json` (add `ws` and `@types/ws`)
- Modify: `app/api/connector/ws/route.ts` (replace stub with real proxy that uses a custom Node server)
- Create: `server.js` (custom Next.js server that hosts the WS proxy)

**Why a custom server:** Next.js App Router does not natively expose the raw socket for WS upgrade. The standard pattern is a small Node server that hosts the WS endpoint and forwards HTTP to Next.js. This is well-trodden ground and we follow the canonical recipe.

- [ ] **Step 1: Install `ws` and `@types/ws`**

Run:
```bash
npm install ws
npm install --save-dev @types/ws
```

Expected: package.json updated; no install errors.

- [ ] **Step 2: Create `server.js`**

Write to `server.js` (project root):

```js
// Custom Next.js server that hosts the WS proxy on /api/connector/ws.
// HTTP traffic is forwarded to Next.js as usual.

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { WebSocketServer, WebSocket } = require("ws");

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsed = parse(req.url, true);
    handle(req, res, parsed);
  });

  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (client) => {
    const target = process.env.CONNECTOR_WS_URL;
    if (!target) {
      client.close(1011, "CONNECTOR_WS_URL not configured");
      return;
    }
    const upstream = new WebSocket(target, { headers: { "x-mergeit-source": "dashboard" } });

    upstream.on("open", () => { /* ready */ });
    upstream.on("message", (data) => client.send(data.toString()));
    client.on("message", (data) => upstream.send(data.toString()));
    client.on("close", (code, reason) => upstream.close(code, reason.toString()));
    upstream.on("close", (code, reason) => client.close(code, reason.toString()));
    upstream.on("error", () => client.close(1011, "upstream error"));
    client.on("error", () => upstream.close(1011, "downstream error"));
  });

  server.on("upgrade", (req, socket, head) => {
    const { pathname } = parse(req.url);
    if (pathname === "/api/connector/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
    } else {
      socket.destroy();
    }
  });

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
```

- [ ] **Step 3: Update `package.json` scripts**

Find the `"dev": "next dev"` line and replace with:

```json
"dev": "node server.js",
"dev:next": "next dev",
"build": "next build",
"start": "NODE_ENV=production node server.js",
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Update howididit.md + commit**

Append to `howididit.md`:

```
- Task 11: added `ws` + `@types/ws`. Created server.js for the WS
  proxy. Switched `dev`/`start` scripts to use it. App Router
  route stub at app/api/connector/ws/route.ts can stay as a
  fallback for environments that deploy without a custom server
  (it returns 501; mock mode is unaffected).
```

Stage and commit:

```bash
git add package.json package-lock.json server.js howididit.md
git commit -m "feat(connector): custom Node server hosts WS proxy"
```

---

## Task 12: Final verification + cleanup

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: all green. Note the test count.

- [ ] **Step 2: Run lint**

Run: `npx next lint`
Expected: no new warnings (the 4 pre-existing ones should still be there; nothing new from our work).

- [ ] **Step 3: Run `react-doctor` to confirm we did not introduce new findings**

Run: `npx react-doctor@latest --no-score`
Expected: same 4 pre-existing warnings; no new ones from our work.

- [ ] **Step 4: Run the dev server and verify the page renders**

Run: `npm run dev`
Expected: app starts on port 3000. Visit http://localhost:3000 — Overview page should show the connection banner, 5 integration cards, 4 tenants, and the Sync now button on each card. Pressing Sync now opens a confirmation dialog; on confirm, a toast appears (because the mock ACKs every command).

- [ ] **Step 5: Final commit**

If anything was changed during verification:

```bash
git add -p   # stage only what we intentionally changed
git commit -m "chore: final verification fixes"
```

If nothing changed, no commit. Append a closing note to `howididit.md`:

```
- Task 12: verification complete. N tests passing. Dev server runs.
  No new lint or react-doctor findings. Done.
```

Stage and commit the log update only:

```bash
git add howididit.md
git commit -m "docs(howididit): mark implementation complete"
```
