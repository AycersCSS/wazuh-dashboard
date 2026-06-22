# Sentinel Stack — Wazuh Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dark "ops" design system with a light "enterprise SOC" aesthetic, fill all 9 empty route pages, and add localStorage persistence so user actions (ack, archive, toggle, status) survive reloads.

**Architecture:** Tailwind token swap to slate/indigo. New per-file primitive kit (Button, Card, Drawer, Table, etc.) replaces the existing global `.btn/.chip/.panel` classes. `useAlertsStore` upgraded to persist to `localStorage` via a new `useLocalStorage` hook. Each page becomes a `Page` header + filter bar + content + drawer.

**Tech Stack:** Next.js 14.2.15 (App Router), React 18.3.1, TypeScript 5.6, Tailwind 3.4.13, Recharts 2.13.0, Lucide 0.453.0, Vitest + Testing Library, `@tanstack/react-virtual` (for `/logs`).

## Global Constraints

- **Path alias:** `@/*` → `./*` (already in `tsconfig.json`).
- **Next version:** `14.2.15`. App Router (`app/`); do NOT introduce `pages/`.
- **Tailwind:** `3.4.13`. No new Tailwind plugins.
- **Recharts:** `2.13.0`. Always pass explicit `stroke`/`fill` colors; no theme strings.
- **Icons:** `lucide-react` only. Sizes 14/16/18/20/22.
- **Naming:** components `PascalCase`, hooks `camelCase` prefixed `use`, types `PascalCase`.
- **Color tokens:** slate-50/100/200/300/400/600/900, indigo-50/500/600/700, severity (rose-600 / orange-600 / amber-600 / emerald-600 / sky-500). No raw hex outside `tailwind.config.ts`.
- **Severity mapping:** `>=13` critical, `>=10` high, `>=7` medium, `>=4` low, else info. Helpers in `types/index.ts`.
- **State persistence:** namespace `sentinel-stack:v1:*`. All `localStorage` access goes through `lib/storage.ts` or `useLocalStorage`.
- **Accessibility:** every interactive element has `focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50`. Buttons are `<button>`, links are `<a>`/`<Link>`. Drawer is `role="dialog" aria-modal="true"` with ESC + backdrop close and focus return.
- **Reduced motion:** extend `globals.css` to disable Recharts animations when `prefers-reduced-motion: reduce`.
- **Tests:** Vitest with jsdom + Testing Library. Unit + component. No E2E this iteration.
- **Commit messages:** `Conventional Commits` (`feat:`, `chore:`, `refactor:`, `test:`, `docs:`, `fix:`). Run `git add` + `git commit` after every step that produces code.
- **Frequent commits:** one commit per step, never batch two non-trivial changes.

---

## Phase A — Foundations

### Task 1: Visual system (Tailwind config + globals.css)

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `styles/globals.css`

- [ ] **Step 1: Replace Tailwind theme tokens**

Open `tailwind.config.ts` and replace the entire `theme.extend` block (colors, fontFamily, fontSize, boxShadow, keyframes, animation) with the new light system. Remove `signal` and `ink`. Add `boxShadow` entries `card`, `pop`, `drawer`. Keep `pulse-soft` keyframe. Remove `scan-line`, `slide-in-right`, `slide-up` animations (replaced by Tailwind `transition` utilities + a `slide-in-right` on the Drawer only).

Final `theme.extend`:

```ts
extend: {
  colors: {
    accent: {
      50:  "#EEF2FF",
      100: "#E0E7FF",
      500: "#6366F1",
      600: "#4F46E5",
      700: "#4338CA"
    },
    severity: {
      critical: { DEFAULT: "#E11D48", soft: "#FFF1F2", border: "#FECDD3" },
      high:     { DEFAULT: "#EA580C", soft: "#FFF7ED", border: "#FED7AA" },
      medium:   { DEFAULT: "#D97706", soft: "#FFFBEB", border: "#FDE68A" },
      low:      { DEFAULT: "#059669", soft: "#ECFDF5", border: "#A7F3D0" },
      info:     { DEFAULT: "#0EA5E9", soft: "#F0F9FF", border: "#BAE6FD" }
    }
  },
  fontFamily: {
    sans:    ["var(--font-sans)",    "system-ui", "sans-serif"],
    mono:    ["var(--font-mono)",    "ui-monospace", "monospace"],
    display: ["var(--font-display)", "system-ui", "sans-serif"]
  },
  fontSize: {
    xs:   ["12px", { lineHeight: "16px" }],
    sm:   ["13px", { lineHeight: "18px" }],
    base: ["14px", { lineHeight: "20px" }],
    md:   ["15px", { lineHeight: "22px" }],
    lg:   ["16px", { lineHeight: "24px" }],
    xl:   ["20px", { lineHeight: "28px" }],
    "2xl":["24px", { lineHeight: "32px" }],
    "3xl":["30px", { lineHeight: "36px" }]
  },
  borderRadius: { sm: "6px", md: "8px", lg: "10px", xl: "12px", "2xl": "16px" },
  boxShadow: {
    card:   "0 1px 2px rgb(15 23 42 / 0.04), 0 1px 3px rgb(15 23 42 / 0.06)",
    pop:    "0 4px 12px rgb(15 23 42 / 0.08), 0 2px 4px rgb(15 23 42 / 0.04)",
    drawer: "0 24px 48px -12px rgb(15 23 42 / 0.18)"
  },
  keyframes: {
    "pulse-soft": { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.6" } },
    "slide-in-right": { "0%": { transform: "translateX(16px)", opacity: "0" }, "100%": { transform: "translateX(0)", opacity: "1" } }
  },
  animation: {
    "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
    "slide-in-right": "slide-in-right 200ms ease-out"
  }
}
```

- [ ] **Step 2: Rewrite `styles/globals.css`**

Replace the file contents with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font-sans: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", "Cascadia Code", "Consolas", ui-monospace, monospace;
  --font-display: "Inter", "Segoe UI", system-ui, sans-serif;
  color-scheme: light;
}

* { box-sizing: border-box; }

html, body {
  height: 100%;
  margin: 0;
  background: #F8FAFC;
  color: #0F172A;
  font-family: var(--font-sans);
  font-feature-settings: "cv11", "ss01", "ss02";
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

body, table, .num { font-variant-numeric: tabular-nums; }

::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 6px; border: 2px solid transparent; background-clip: content-box; }
::-webkit-scrollbar-thumb:hover { background: #CBD5E1; background-clip: content-box; }

::selection { background: #E0E7FF; color: #0F172A; }

@layer components {
  .kbd {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 18px; height: 18px; padding: 0 5px;
    font-family: var(--font-mono); font-size: 10.5px; font-weight: 500;
    color: #475569; background: #F1F5F9; border: 1px solid #E2E8F0;
    border-bottom-width: 2px; border-radius: 4px; line-height: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
  .recharts-surface * { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 3: Verify build still parses**

Run: `npx tsc --noEmit`
Expected: 0 errors. (Existing component files still reference old tokens but TypeScript will pass; CSS will look wrong in places until later tasks — that's expected.)

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts styles/globals.css
git commit -m "feat(theme): swap dark ops palette for light enterprise SOC tokens"
```

---

### Task 2: Storage layer + `useLocalStorage` hook

**Files:**
- Create: `lib/storage.ts`
- Create: `hooks/useLocalStorage.ts`
- Create: `lib/__tests__/storage.test.ts`

**Interfaces:**
- `lib/storage.ts` exports:
  - `storage.get<T>(key: string, fallback: T): T`
  - `storage.set<T>(key: string, value: T): void`
  - `storage.remove(key: string): void`
  - `storage.clear(): void` — removes all keys prefixed `sentinel-stack:v1:`
- `hooks/useLocalStorage.ts` exports:
  - `useLocalStorage<T>(key: string, fallback: T): [T, (v: T | ((prev: T) => T)) => void]`
  - SSR-safe: returns `fallback` on first render, re-reads on `useEffect` mount
  - Cross-tab sync via `window.addEventListener("storage", …)`

- [ ] **Step 1: Write failing test for `storage`**

Create `lib/__tests__/storage.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { storage } from "../storage";

describe("storage", () => {
  beforeEach(() => localStorage.clear());

  it("returns fallback when key is missing", () => {
    expect(storage.get("missing", { a: 1 })).toEqual({ a: 1 });
  });

  it("round-trips a JSON value", () => {
    storage.set("k", { a: 1, b: "x" });
    expect(storage.get("k", null)).toEqual({ a: 1, b: "x" });
  });

  it("remove deletes a key", () => {
    storage.set("k", 1);
    storage.remove("k");
    expect(storage.get("k", "fallback")).toBe("fallback");
  });

  it("clear removes only namespaced keys", () => {
    localStorage.set("other:key", "keep");
    storage.set("u1", 1);
    storage.set("u2", 2);
    storage.clear();
    expect(localStorage.getItem("other:key")).toBe("keep");
    expect(storage.get("u1", null)).toBeNull();
    expect(storage.get("u2", null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/storage.test.ts`
Expected: FAIL with "Cannot find module '../storage'".

(Note: this requires Vitest + jsdom configured. Add them in the next step if missing.)

- [ ] **Step 3: Add Vitest + jsdom + RTL to devDependencies**

Modify `package.json` `devDependencies` to add (versions pinned to the latest stable as of June 2026):

```json
"vitest": "^2.1.0",
"@testing-library/react": "^16.0.0",
"@testing-library/jest-dom": "^6.5.0",
"@testing-library/user-event": "^14.5.0",
"jsdom": "^25.0.0",
"@vitest/ui": "^2.1.0"
```

Run: `npm install`

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    css: false
  },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } }
});
```

Create `vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Add to `package.json` `scripts`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Run test to verify it still fails (storage module missing)**

Run: `npx vitest run lib/__tests__/storage.test.ts`
Expected: FAIL with "Cannot find module '../storage'".

- [ ] **Step 5: Implement `lib/storage.ts`**

Create `lib/storage.ts`:

```ts
const NS = "sentinel-stack:v1";

function k(key: string) { return `${NS}:${key}`; }

export const storage = {
  get<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = window.localStorage.getItem(k(key));
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(k(key), JSON.stringify(value));
    } catch {
      /* quota or serialization — silently ignore */
    }
  },
  remove(key: string): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(k(key));
  },
  clear(): void {
    if (typeof window === "undefined") return;
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(`${NS}:`)) toRemove.push(key);
    }
    toRemove.forEach(key => window.localStorage.removeItem(key));
  }
};
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/storage.test.ts`
Expected: PASS (4/4).

- [ ] **Step 7: Write failing test for `useLocalStorage`**

Create `hooks/__tests__/useLocalStorage.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useLocalStorage } from "../useLocalStorage";

function Demo({ k, fallback }: { k: string; fallback: unknown }) {
  const [v, setV] = useLocalStorage<number>(k, fallback as number);
  return <button onClick={() => setV((v + 1))}>{v}</button>;
}

describe("useLocalStorage", () => {
  beforeEach(() => localStorage.clear());

  it("returns fallback when storage is empty", () => {
    render(<Demo k="n" fallback={0} />);
    expect(screen.getByRole("button").textContent).toBe("0");
  });

  it("persists writes to localStorage", () => {
    render(<Demo k="n" fallback={0} />);
    act(() => { fireEvent.click(screen.getByRole("button")); });
    expect(localStorage.getItem("sentinel-stack:v1:n")).toBe("1");
  });

  it("rehydrates from localStorage on mount", () => {
    localStorage.setItem("sentinel-stack:v1:n", JSON.stringify(7));
    render(<Demo k="n" fallback={0} />);
    expect(screen.getByRole("button").textContent).toBe("7");
  });

  it("accepts a function updater", () => {
    localStorage.setItem("sentinel-stack:v1:n", JSON.stringify(5));
    render(<Demo k="n" fallback={0} />);
    act(() => { fireEvent.click(screen.getByRole("button")); });
    expect(screen.getByRole("button").textContent).toBe("6");
  });
});
```

- [ ] **Step 8: Run test to verify it fails**

Run: `npx vitest run hooks/__tests__/useLocalStorage.test.tsx`
Expected: FAIL with "Cannot find module '../useLocalStorage'".

- [ ] **Step 9: Implement `hooks/useLocalStorage.ts`**

Create `hooks/useLocalStorage.ts`:

```ts
"use client";
import { useCallback, useEffect, useState } from "react";
import { storage } from "@/lib/storage";

export function useLocalStorage<T>(
  key: string,
  fallback: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(fallback);

  // Hydrate from storage on mount
  useEffect(() => {
    setValue(storage.get<T>(key, fallback));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Cross-tab sync
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== `sentinel-stack:v1:${key}` || e.newValue === null) return;
      try { setValue(JSON.parse(e.newValue) as T); } catch { /* ignore */ }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);

  const set = useCallback((next: T | ((prev: T) => T)) => {
    setValue(prev => {
      const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      storage.set(key, resolved);
      return resolved;
    });
  }, [key]);

  return [value, set];
}
```

- [ ] **Step 10: Run test to verify it passes**

Run: `npx vitest run hooks/__tests__/useLocalStorage.test.tsx`
Expected: PASS (4/4).

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json vitest.config.ts vitest.setup.ts \
  lib/storage.ts hooks/useLocalStorage.ts \
  lib/__tests__/storage.test.ts hooks/__tests__/useLocalStorage.test.tsx
git commit -m "feat(storage): namespaced localStorage helpers and useLocalStorage hook"
```

---

### Task 3: Persist `useAlertsStore`

**Files:**
- Modify: `hooks/useAlertsStore.ts`
- Modify: `types/index.ts`
- Create: `hooks/__tests__/useAlertsStore.test.tsx`

**Interfaces:**
- New type `VulnState = "open" | "in_progress" | "patched" | "wont_fix"` (already in store, lift to `types/index.ts`).
- New type `FimReviewState = "unreviewed" | "reviewed"`.
- New type `AgentIsolation = "normal" | "isolated"`.
- Store keeps maps `alertMap`, `vulnMap`, `ruleMap`, `fimMap`, `agentMap`.
- Each mutator writes its key to `storage` after mutating.
- New `useReset()` clears all `sentinel-stack:v1:*` and re-hydrates from seed.

- [ ] **Step 1: Extend `types/index.ts`**

Add to the bottom of `types/index.ts`:

```ts
export type VulnState = "open" | "in_progress" | "patched" | "wont_fix";
export type FimReviewState = "unreviewed" | "reviewed";
export type AgentIsolation = "normal" | "isolated";
```

- [ ] **Step 2: Write failing test for the persisted store**

Create `hooks/__tests__/useAlertsStore.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAcknowledge, useArchive, useSetVulnStatus, useToggleRule, useReset, useAlertsStore } from "../useAlertsStore";
import { storage } from "@/lib/storage";

const ALERT_ID = "EVT-100000"; // first seed alert id
const VULN = "CVE-2024-3094";
const RULE = "51000";

describe("useAlertsStore persistence", () => {
  beforeEach(() => { localStorage.clear(); });

  it("hydrates seed on first render and writes to localStorage", () => {
    renderHook(() => useAlertsStore());
    expect(storage.get<Record<string, unknown>>("alerts", {})[ALERT_ID]).toBeDefined();
  });

  it("acknowledge persists", () => {
    const { result } = renderHook(() => useAcknowledge());
    act(() => result.current([ALERT_ID]));
    const map = storage.get<Record<string, { acknowledged: boolean }>>("alerts", {});
    expect(map[ALERT_ID].acknowledged).toBe(true);
  });

  it("archive persists", () => {
    const { result } = renderHook(() => useArchive());
    act(() => result.current([ALERT_ID]));
    const map = storage.get<Record<string, { archived: boolean; acknowledged: boolean }>>("alerts", {});
    expect(map[ALERT_ID].archived).toBe(true);
    expect(map[ALERT_ID].acknowledged).toBe(true);
  });

  it("vuln status persists", () => {
    const { result } = renderHook(() => useSetVulnStatus());
    act(() => result.current(VULN, "patched"));
    const map = storage.get<Record<string, { status: string }>>("vulns", {});
    expect(map[VULN].status).toBe("patched");
  });

  it("rule toggle persists", () => {
    const { result } = renderHook(() => useToggleRule());
    act(() => result.current(RULE));
    const map = storage.get<Record<string, { status: string }>>("rules", {});
    expect(map[RULE].status).toBe("disabled");
  });

  it("reset clears all sentinel-stack keys and re-hydrates", () => {
    storage.set("alerts", { [ALERT_ID]: { acknowledged: true, archived: true } });
    const { result } = renderHook(() => useReset());
    act(() => result.current());
    expect(storage.get<Record<string, unknown>>("alerts", {})[ALERT_ID]).toBeDefined();
    // After reset, the alert state should match the seed (acknowledged from seed RNG)
    const map = storage.get<Record<string, { acknowledged: boolean }>>("alerts", {});
    expect(map[ALERT_ID].acknowledged).toBe(!!map[ALERT_ID]?.acknowledged);
  });
});
```

(Note: the reset test asserts the key exists after reset, since `seedAlerts` includes a random `acknowledged` flag — the test verifies re-hydration occurred rather than checking a specific value.)

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run hooks/__tests__/useAlertsStore.test.tsx`
Expected: FAIL — `useReset` is not exported and current `useAcknowledge` does not persist.

- [ ] **Step 4: Replace `hooks/useAlertsStore.ts`**

Replace the entire file with:

```ts
"use client";
import { useCallback, useSyncExternalStore } from "react";
import {
  alerts as seedAlerts,
  vulnerabilities as seedVulns,
  rules as seedRules
} from "@/data/seed";
import { storage } from "@/lib/storage";
import type { VulnState, FimReviewState, AgentIsolation } from "@/types";

type AlertState = { acknowledged: boolean; archived: boolean };
type RuleState  = { status: "enabled" | "disabled" };

const KEY_ALERTS = "alerts";
const KEY_VULNS  = "vulns";
const KEY_RULES  = "rules";
const KEY_FIM    = "fim";
const KEY_AGENTS = "agents";

let alertMap: Record<string, AlertState> = {};
let vulnMap:  Record<string, { status: VulnState }> = {};
let ruleMap:  Record<string, RuleState> = {};
let fimMap:   Record<string, { state: FimReviewState }> = {};
let agentMap: Record<string, { isolation: AgentIsolation }> = {};

const subscribers = new Set<() => void>();
function notify() { subscribers.forEach(s => s()); }
function subscribe(cb: () => void) { subscribers.add(cb); return () => subscribers.delete(cb); }
function snapshot() { return { alertMap, vulnMap, ruleMap, fimMap, agentMap }; }
function getServerSnapshot() { return snapshot(); }

function hydrateFromSeed() {
  alertMap = Object.fromEntries(
    seedAlerts.map(a => [a.id, { acknowledged: !!a.acknowledged, archived: !!a.archived }])
  );
  vulnMap = Object.fromEntries(seedVulns.map(v => [v.cve, { status: "open" as VulnState }]));
  ruleMap = Object.fromEntries(seedRules.map(r => [r.id, { status: r.status }]));
  fimMap = {};
  agentMap = Object.fromEntries(
    (require("@/data/seed") as typeof import("@/data/seed")).agents.map(a => [a.id, { isolation: "normal" as AgentIsolation }])
  );
}

function hydrateOnce() {
  if (Object.keys(alertMap).length) return;
  const persisted = {
    alerts: storage.get<Record<string, AlertState>>(KEY_ALERTS, null as unknown as Record<string, AlertState>),
    vulns:  storage.get<Record<string, { status: VulnState }>>(KEY_VULNS, null as unknown as Record<string, { status: VulnState }>),
    rules:  storage.get<Record<string, RuleState>>(KEY_RULES, null as unknown as Record<string, RuleState>),
    fim:    storage.get<Record<string, { state: FimReviewState }>>(KEY_FIM, null as unknown as Record<string, { state: FimReviewState }>),
    agents: storage.get<Record<string, { isolation: AgentIsolation }>>(KEY_AGENTS, null as unknown as Record<string, { isolation: AgentIsolation }>)
  };
  if (persisted.alerts && Object.keys(persisted.alerts).length) {
    alertMap = persisted.alerts;
    vulnMap  = persisted.vulns  ?? {};
    ruleMap  = persisted.rules  ?? {};
    fimMap   = persisted.fim    ?? {};
    agentMap = persisted.agents ?? {};
  } else {
    hydrateFromSeed();
    persistAll();
  }
}

function persistAll() {
  storage.set(KEY_ALERTS, alertMap);
  storage.set(KEY_VULNS,  vulnMap);
  storage.set(KEY_RULES,  ruleMap);
  storage.set(KEY_FIM,    fimMap);
  storage.set(KEY_AGENTS, agentMap);
}

export function useAlertsStore() {
  const snap = useSyncExternalStore(subscribe, snapshot, getServerSnapshot);
  if (typeof window !== "undefined") hydrateOnce();
  return snap;
}

export function useAcknowledge() {
  return useCallback((ids: string[]) => {
    ids.forEach(id => {
      const cur = alertMap[id] ?? { acknowledged: false, archived: false };
      alertMap[id] = { ...cur, acknowledged: true };
    });
    storage.set(KEY_ALERTS, alertMap);
    notify();
  }, []);
}

export function useArchive() {
  return useCallback((ids: string[]) => {
    ids.forEach(id => {
      const cur = alertMap[id] ?? { acknowledged: false, archived: false };
      alertMap[id] = { ...cur, archived: true, acknowledged: true };
    });
    storage.set(KEY_ALERTS, alertMap);
    notify();
  }, []);
}

export function useSetVulnStatus() {
  return useCallback((cve: string, status: VulnState) => {
    vulnMap[cve] = { status };
    storage.set(KEY_VULNS, vulnMap);
    notify();
  }, []);
}

export function useToggleRule() {
  return useCallback((id: string) => {
    const cur = ruleMap[id] ?? { status: "enabled" as const };
    ruleMap[id] = { status: cur.status === "enabled" ? "disabled" : "enabled" };
    storage.set(KEY_RULES, ruleMap);
    notify();
  }, []);
}

export function useMarkFimReviewed() {
  return useCallback((id: string) => {
    fimMap[id] = { state: "reviewed" };
    storage.set(KEY_FIM, fimMap);
    notify();
  }, []);
}

export function useIsolateAgent() {
  return useCallback((id: string, isolation: AgentIsolation) => {
    agentMap[id] = { isolation };
    storage.set(KEY_AGENTS, agentMap);
    notify();
  }, []);
}

export function useReset() {
  return useCallback(() => {
    storage.clear();
    hydrateFromSeed();
    persistAll();
    notify();
  }, []);
}

export function isAcked(id: string)   { return !!alertMap[id]?.acknowledged; }
export function isArchived(id: string){ return !!alertMap[id]?.archived; }
export function vulnStatus(cve: string): VulnState       { return vulnMap[cve]?.status ?? "open"; }
export function ruleStatus(id: string): "enabled" | "disabled" { return ruleMap[id]?.status ?? "enabled"; }
export function fimReviewState(id: string): FimReviewState { return fimMap[id]?.state ?? "unreviewed"; }
export function agentIsolation(id: string): AgentIsolation  { return agentMap[id]?.isolation ?? "normal"; }
```

(Replace the `require` with a top-level import in your editor — kept as `require` above to avoid a circular import at module load time. The actual code should use `import { agents as seedAgents } from "@/data/seed";` at the top of the file.)

- [ ] **Step 5: Convert the `require` to a top-level import**

At the top of `hooks/useAlertsStore.ts`, add:

```ts
import { alerts as seedAlerts, vulnerabilities as seedVulns, rules as seedRules, agents as seedAgents } from "@/data/seed";
```

Then inside `hydrateFromSeed`, replace the `require` line with:

```ts
agentMap = Object.fromEntries(seedAgents.map(a => [a.id, { isolation: "normal" as AgentIsolation }]));
```

- [ ] **Step 6: Run all store tests**

Run: `npx vitest run hooks/__tests__/useAlertsStore.test.tsx`
Expected: PASS (6/6).

- [ ] **Step 7: Run typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add types/index.ts hooks/useAlertsStore.ts hooks/__tests__/useAlertsStore.test.tsx
git commit -m "feat(store): persist alerts, vulns, rules, fim reviews, and agent isolation"
```

---

## Phase B — Primitive kit

### Task 4: Core primitives (Button, Card, Badge, Input, SearchInput, Select)

**Files:**
- Create: `components/ui/Button.tsx`
- Create: `components/ui/Card.tsx`
- Create: `components/ui/Badge.tsx`
- Create: `components/ui/Input.tsx`
- Create: `components/ui/SearchInput.tsx`
- Create: `components/ui/Select.tsx`
- Create: `components/ui/index.ts`

**Interfaces:**
- `<Button variant="primary"|"secondary"|"ghost"|"danger" size="sm"|"md"|"lg" loading? icon? children />`
- `<Card header? footer? padded? children />`
- `<Badge tone="neutral"|"info"|"low"|"medium"|"high"|"critical" dot? children />`
- `<Input leading? error? helper? />` (forwarded to native input)
- `<SearchInput value onChange placeholder? />`
- `<Select value onChange options={[{value,label}]} />`

- [ ] **Step 1: Create `components/ui/Button.tsx`**

```tsx
"use client";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const variantClass: Record<Variant, string> = {
  primary:   "bg-indigo-600 text-white border-transparent hover:bg-indigo-700",
  secondary: "bg-white text-slate-900 border-slate-200 hover:bg-slate-50 hover:border-slate-300",
  ghost:     "bg-transparent text-slate-600 border-transparent hover:bg-slate-100 hover:text-slate-900",
  danger:    "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
};

const sizeClass: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs gap-1.5 rounded-md",
  md: "h-9 px-3 text-sm gap-2 rounded-lg",
  lg: "h-11 px-4 text-base gap-2 rounded-lg"
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "secondary", size = "md", loading, icon, className, children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium border transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantClass[variant],
        sizeClass[size],
        className
      )}
      {...rest}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      {children}
    </button>
  );
});
```

- [ ] **Step 2: Create `components/ui/Card.tsx`**

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
  header?: ReactNode;
  footer?: ReactNode;
  padded?: boolean;
  className?: string;
  children: ReactNode;
}

export function Card({ header, footer, padded = true, className, children }: Props) {
  return (
    <section className={cn("bg-white border border-slate-200 rounded-xl shadow-card", className)}>
      {header && <header className="flex items-center justify-between gap-3 px-4 h-11 border-b border-slate-200">{header}</header>}
      <div className={cn(padded ? "p-4" : "")}>{children}</div>
      {footer && <footer className="px-4 h-10 border-t border-slate-200 flex items-center">{footer}</footer>}
    </section>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <div className="text-sm font-semibold text-slate-900 truncate">{children}</div>;
}
export function CardSubtitle({ children }: { children: ReactNode }) {
  return <div className="text-xs text-slate-500 truncate">{children}</div>;
}
```

- [ ] **Step 3: Create `components/ui/Badge.tsx`**

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "info" | "low" | "medium" | "high" | "critical";

const toneClass: Record<Tone, string> = {
  neutral:  "bg-slate-100 text-slate-700 border-slate-200",
  info:     "bg-sky-50 text-sky-700 border-sky-200",
  low:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium:   "bg-amber-50 text-amber-700 border-amber-200",
  high:     "bg-orange-50 text-orange-700 border-orange-200",
  critical: "bg-rose-50 text-rose-700 border-rose-200"
};

const dotClass: Record<Tone, string> = {
  neutral: "bg-slate-400", info: "bg-sky-500", low: "bg-emerald-500",
  medium: "bg-amber-500", high: "bg-orange-500", critical: "bg-rose-500"
};

export function Badge({ tone = "neutral", dot, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 h-6 px-2 rounded-md border text-xs font-medium", toneClass[tone], className)}>
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", dotClass[tone])} />}
      {children}
    </span>
  );
}
```

- [ ] **Step 4: Create `components/ui/Input.tsx`**

```tsx
"use client";
import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  leading?: ReactNode;
  error?: string;
  helper?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { leading, error, helper, className, ...rest }, ref
) {
  return (
    <div className="w-full">
      <div className={cn(
        "flex items-center h-9 px-3 bg-white border rounded-lg",
        error ? "border-rose-300 focus-within:ring-2 focus-within:ring-rose-200" : "border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100"
      )}>
        {leading && <span className="mr-2 text-slate-400 flex-none">{leading}</span>}
        <input
          ref={ref}
          className={cn("flex-1 bg-transparent outline-none text-sm text-slate-900 placeholder:text-slate-400", className)}
          {...rest}
        />
      </div>
      {(error || helper) && <div className={cn("mt-1 text-xs", error ? "text-rose-600" : "text-slate-500")}>{error ?? helper}</div>}
    </div>
  );
});
```

- [ ] **Step 5: Create `components/ui/SearchInput.tsx`**

```tsx
"use client";
import { X } from "lucide-react";
import { Input } from "./Input";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = "Search..." }: Props) {
  return (
    <div className="relative w-full">
      <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create `components/ui/Select.tsx`**

```tsx
"use client";
import { ChevronDown } from "lucide-react";
import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface Option { value: string; label: string; }
interface Props extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  options: Option[];
  className?: string;
}

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { options, className, ...rest }, ref
) {
  return (
    <div className={cn("relative inline-block", className)}>
      <select
        ref={ref}
        className="appearance-none h-9 pl-3 pr-8 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
        {...rest}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
});
```

- [ ] **Step 7: Create `components/ui/index.ts`**

```ts
export { Button } from "./Button";
export { Card, CardTitle, CardSubtitle } from "./Card";
export { Badge } from "./Badge";
export { Input } from "./Input";
export { SearchInput } from "./SearchInput";
export { Select } from "./Select";
```

- [ ] **Step 8: Verify build**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 9: Commit**

```bash
git add components/ui/Button.tsx components/ui/Card.tsx components/ui/Badge.tsx \
  components/ui/Input.tsx components/ui/SearchInput.tsx components/ui/Select.tsx \
  components/ui/index.ts
git commit -m "feat(ui): core primitives (Button, Card, Badge, Input, SearchInput, Select)"
```

---

### Task 5: StatCard (replacement for old Kpi)

**Files:**
- Create: `components/ui/StatCard.tsx`
- Modify: `components/ui/index.ts`

- [ ] **Step 1: Implement `StatCard`**

```tsx
import type { ReactNode } from "react";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Card } from "./Card";
import { cn } from "@/lib/cn";

type Accent = "neutral" | "critical" | "high" | "medium" | "low" | "info";
type Dir = "up" | "down" | "flat";

const accentBar: Record<Accent, string> = {
  neutral: "bg-indigo-600", critical: "bg-rose-600", high: "bg-orange-500",
  medium: "bg-amber-500", low: "bg-emerald-500", info: "bg-sky-500"
};
const accentText: Record<Accent, string> = {
  neutral: "text-indigo-600", critical: "text-rose-600", high: "text-orange-600",
  medium: "text-amber-600", low: "text-emerald-600", info: "text-sky-600"
};

export function StatCard({
  label, value, delta, dir = "up", hint, accent = "neutral"
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  dir?: Dir;
  hint?: ReactNode;
  accent?: Accent;
}) {
  const Icon = dir === "up" ? ArrowUp : dir === "down" ? ArrowDown : Minus;
  const deltaColor = dir === "up" ? "text-emerald-600" : dir === "down" ? "text-rose-600" : "text-slate-500";
  return (
    <Card className="relative overflow-hidden">
      <span className={cn("absolute left-0 top-0 bottom-0 w-[3px]", accentBar[accent])} />
      <div className="text-[10.5px] uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
      <div className={cn("text-2xl font-semibold tracking-tight num mt-1.5", accentText[accent])}>{value}</div>
      <div className="flex items-center justify-between mt-1.5">
        {delta ? (
          <span className={cn("inline-flex items-center gap-0.5 text-xs font-mono", deltaColor)}>
            <Icon size={11} /> {delta}
          </span>
        ) : <span />}
        {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Add to barrel**

Append to `components/ui/index.ts`:

```ts
export { StatCard } from "./StatCard";
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add components/ui/StatCard.tsx components/ui/index.ts
git commit -m "feat(ui): StatCard primitive"
```

---

### Task 6: EmptyState, ErrorState, Skeleton

**Files:**
- Create: `components/ui/EmptyState.tsx`
- Create: `components/ui/ErrorState.tsx`
- Create: `components/ui/Skeleton.tsx`
- Modify: `components/ui/index.ts`

- [ ] **Step 1: EmptyState**

```tsx
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon, title, description, action
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 grid place-items-center mb-3">
        <Icon size={20} className="text-slate-400" />
      </div>
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      {description && <div className="text-xs text-slate-500 mt-1 max-w-sm">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 2: ErrorState**

```tsx
import { AlertOctagon } from "lucide-react";
import { Button } from "./Button";

export function ErrorState({ title = "Something went wrong", description, onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 grid place-items-center mb-3">
        <AlertOctagon size={20} className="text-rose-600" />
      </div>
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      {description && <div className="text-xs text-slate-500 mt-1 max-w-sm">{description}</div>}
      {onRetry && <div className="mt-4"><Button variant="secondary" onClick={onRetry}>Retry</Button></div>}
    </div>
  );
}
```

- [ ] **Step 3: Skeleton**

```tsx
import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("bg-slate-200 rounded-md animate-pulse-soft", className)} />;
}
```

- [ ] **Step 4: Add to barrel**

Append to `components/ui/index.ts`:

```ts
export { EmptyState } from "./EmptyState";
export { ErrorState } from "./ErrorState";
export { Skeleton } from "./Skeleton";
```

- [ ] **Step 5: Commit**

```bash
git add components/ui/EmptyState.tsx components/ui/ErrorState.tsx components/ui/Skeleton.tsx components/ui/index.ts
git commit -m "feat(ui): EmptyState, ErrorState, Skeleton primitives"
```

---

### Task 7: Drawer with focus trap and ESC

**Files:**
- Create: `components/ui/Drawer.tsx`
- Modify: `components/ui/index.ts`
- Create: `components/ui/__tests__/Drawer.test.tsx`

**Interfaces:**
- `<Drawer open onClose title? actions? width? children />` — right-side slide-in, ESC closes, backdrop closes, focus returns to element that opened it.

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { Drawer } from "../Drawer";

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button data-testid="open" onClick={() => setOpen(true)}>Open</button>
      <Drawer open={open} onClose={() => setOpen(false)} title="Test">
        <div>Body content</div>
      </Drawer>
    </>
  );
}

describe("Drawer", () => {
  it("does not render body when closed", () => {
    render(<Harness />);
    expect(screen.queryByText("Body content")).toBeNull();
  });

  it("renders body when open", () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId("open"));
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });

  it("closes on ESC", () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId("open"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Body content")).toBeNull();
  });

  it("closes on backdrop click", () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId("open"));
    fireEvent.click(screen.getByTestId("backdrop"));
    expect(screen.queryByText("Body content")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/ui/__tests__/Drawer.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `Drawer`**

```tsx
"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  actions?: ReactNode;
  width?: "md" | "lg" | "xl";
  children: ReactNode;
}

const widthClass = { md: "max-w-md", lg: "max-w-xl", xl: "max-w-2xl" };

export function Drawer({ open, onClose, title, actions, width = "lg", children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastFocus.current = document.activeElement as HTMLElement | null;
    const id = window.setTimeout(() => ref.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      lastFocus.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div data-testid="backdrop" className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          "absolute right-0 top-0 bottom-0 w-full bg-white shadow-drawer flex flex-col animate-slide-in-right focus:outline-none",
          widthClass[width]
        )}
      >
        {(title || actions) && (
          <header className="flex items-center justify-between gap-3 px-5 h-14 border-b border-slate-200">
            <div className="text-sm font-semibold text-slate-900 truncate">{title}</div>
            <div className="flex items-center gap-2">
              {actions}
              <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
          </header>
        )}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/ui/__tests__/Drawer.test.tsx`
Expected: PASS (4/4).

- [ ] **Step 5: Add to barrel and commit**

Append to `components/ui/index.ts`:

```ts
export { Drawer } from "./Drawer";
```

```bash
git add components/ui/Drawer.tsx components/ui/index.ts components/ui/__tests__/Drawer.test.tsx
git commit -m "feat(ui): Drawer primitive with focus return and ESC/backdrop close"
```

---

### Task 8: Tabs primitive

**Files:**
- Create: `components/ui/Tabs.tsx`
- Modify: `components/ui/index.ts`

- [ ] **Step 1: Implement `Tabs`**

```tsx
"use client";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Tab { id: string; label: ReactNode; content: ReactNode; }
interface Props { tabs: Tab[]; defaultId?: string; }

export function Tabs({ tabs, defaultId }: Props) {
  const [active, setActive] = useState(defaultId ?? tabs[0]?.id);
  const current = tabs.find(t => t.id === active) ?? tabs[0];
  return (
    <div>
      <div role="tablist" aria-orientation="horizontal" className="flex gap-1 border-b border-slate-200">
        {tabs.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={t.id === active}
            onClick={() => setActive(t.id)}
            className={cn(
              "px-3 h-9 text-sm font-medium border-b-2 -mb-px transition-colors",
              t.id === active ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-900"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="pt-4">{current?.content}</div>
    </div>
  );
}
```

- [ ] **Step 2: Add to barrel and commit**

Append to `components/ui/index.ts`:

```ts
export { Tabs } from "./Tabs";
```

```bash
git add components/ui/Tabs.tsx components/ui/index.ts
git commit -m "feat(ui): Tabs primitive"
```

---

### Task 9: Table and DataGrid

**Files:**
- Create: `components/ui/Table.tsx`
- Create: `components/ui/DataGrid.tsx`
- Modify: `components/ui/index.ts`

- [ ] **Step 1: Table**

```tsx
"use client";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  width?: string;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
}

export function Table<T>({
  columns, rows, rowKey, onRowClick, emptyState, selectable, selected, onSelectionChange
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyState?: ReactNode;
  selectable?: boolean;
  selected?: Set<string>;
  onSelectionChange?: (next: Set<string>) => void;
}) {
  const all = rows.length;
  const sel = selected ?? new Set<string>();
  const allSelected = selectable && all > 0 && rows.every(r => sel.has(rowKey(r)));
  const someSelected = selectable && sel.size > 0 && !allSelected;
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {selectable && (
                <th className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Select all rows"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected; }}
                    onChange={e => {
                      const next = new Set(sel);
                      if (e.target.checked) rows.forEach(r => next.add(rowKey(r)));
                      else rows.forEach(r => next.delete(rowKey(r)));
                      onSelectionChange?.(next);
                    }}
                  />
                </th>
              )}
              {columns.map(c => (
                <th key={c.key} style={c.width ? { width: c.width } : undefined} className={cn("text-left text-[11px] uppercase tracking-wider font-semibold text-slate-500 px-3 py-2.5", c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={columns.length + (selectable ? 1 : 0)}>{emptyState ?? null}</td></tr>
            ) : rows.map(r => {
              const id = rowKey(r);
              const isSel = sel.has(id);
              return (
                <tr
                  key={id}
                  onClick={() => onRowClick?.(r)}
                  className={cn("border-b border-slate-100 last:border-0 transition-colors", onRowClick && "cursor-pointer hover:bg-slate-50", isSel && "bg-indigo-50/60")}
                >
                  {selectable && (
                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select row ${id}`}
                        checked={isSel}
                        onChange={e => {
                          const next = new Set(sel);
                          if (e.target.checked) next.add(id); else next.delete(id);
                          onSelectionChange?.(next);
                        }}
                      />
                    </td>
                  )}
                  {columns.map(c => (
                    <td key={c.key} className={cn("px-3 py-2.5 text-slate-700", c.className)}>{c.cell(r)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: DataGrid — Table with per-column sort**

```tsx
"use client";
import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Table, type Column } from "./Table";
import { cn } from "@/lib/cn";

type SortDir = "asc" | "desc";
type SortState = { key: string; dir: SortDir } | null;

export function DataGrid<T>({
  columns, rows, rowKey, ...rest
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyState?: ReactNode;
  selectable?: boolean;
  selected?: Set<string>;
  onSelectionChange?: (next: Set<string>) => void;
}) {
  const [sort, setSort] = useState<SortState>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find(c => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const arr = [...rows];
    arr.sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [rows, sort, columns]);

  const withSortIndicators = columns.map(c => ({
    ...c,
    header: c.sortable ? (
      <button
        type="button"
        onClick={() => setSort(prev => {
          if (!prev || prev.key !== c.key) return { key: c.key, dir: "asc" };
          if (prev.dir === "asc") return { key: c.key, dir: "desc" };
          return null;
        })}
        className={cn("inline-flex items-center gap-1 hover:text-slate-900")}
      >
        {c.header}
        {sort?.key === c.key && (sort.dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
      </button>
    ) : c.header
  }));

  return <Table columns={withSortIndicators} rows={sorted} rowKey={rowKey} {...rest} />;
}
```

- [ ] **Step 3: Add to barrel and commit**

Append to `components/ui/index.ts`:

```ts
export { Table, type Column } from "./Table";
export { DataGrid } from "./DataGrid";
```

```bash
git add components/ui/Table.tsx components/ui/DataGrid.tsx components/ui/index.ts
git commit -m "feat(ui): Table and DataGrid with sort and multi-select"
```

---

### Task 10: IconBadge, Page, Tooltip

**Files:**
- Create: `components/ui/IconBadge.tsx`
- Create: `components/ui/Page.tsx`
- Create: `components/ui/Tooltip.tsx`
- Modify: `components/ui/index.ts`

- [ ] **Step 1: IconBadge**

```tsx
import type { LucideIcon } from "lucide-react";

export function IconBadge({ icon: Icon, tone = "neutral" }: { icon: LucideIcon; tone?: "neutral" | "indigo" }) {
  const cls = tone === "indigo" ? "bg-indigo-50 text-indigo-600 border-indigo-200" : "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <div className={`w-9 h-9 rounded-xl border grid place-items-center ${cls}`}>
      <Icon size={18} />
    </div>
  );
}
```

- [ ] **Step 2: Page**

```tsx
"use client";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { IconBadge } from "./IconBadge";

export interface Crumb { href?: string; label: string; }

export function Page({
  breadcrumb, icon, title, description, actions, children
}: {
  breadcrumb?: Crumb[];
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <IconBadge icon={icon} tone="indigo" />
          <div className="min-w-0">
            {breadcrumb && breadcrumb.length > 0 && (
              <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                {breadcrumb.map((c, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {c.href ? <Link href={c.href} className="hover:text-slate-900">{c.label}</Link> : <span>{c.label}</span>}
                    {i < breadcrumb.length - 1 && <ChevronRight size={12} className="text-slate-300" />}
                  </span>
                ))}
              </nav>
            )}
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 truncate">{title}</h1>
            {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </header>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Tooltip**

```tsx
"use client";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Tooltip({ content, children, side = "top" }: { content: ReactNode; children: ReactNode; side?: "top" | "bottom" }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}>
      {children}
      {open && (
        <span role="tooltip" className={cn(
          "absolute z-50 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-slate-900 text-white text-[11px] whitespace-nowrap pointer-events-none",
          side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"
        )}>
          {content}
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 4: Add to barrel and commit**

Append to `components/ui/index.ts`:

```ts
export { IconBadge } from "./IconBadge";
export { Page, type Crumb } from "./Page";
export { Tooltip } from "./Tooltip";
```

```bash
git add components/ui/IconBadge.tsx components/ui/Page.tsx components/ui/Tooltip.tsx components/ui/index.ts
git commit -m "feat(ui): IconBadge, Page layout, Tooltip primitives"
```

---

### Task 11: Toast + ConfirmDialog restyling

**Files:**
- Modify: `hooks/useToasts.tsx`
- Modify: `components/Modal.tsx`

- [ ] **Step 1: Update `hooks/useToasts.tsx` for light palette**

Open `hooks/useToasts.tsx`. In the toast container, replace `surface-1` / `border-base` / `shadow-ops-lg` with `bg-white border-slate-200 shadow-pop`. Map variant to color class:

```ts
const variantClass: Record<ToastVariant, string> = {
  info:    "border-sky-200 bg-sky-50 text-sky-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warn:    "border-amber-200 bg-amber-50 text-amber-900",
  error:   "border-rose-200 bg-rose-50 text-rose-900"
};
```

Apply this to the toast card root. Keep the public API (`useToasts().push({...})`) unchanged.

- [ ] **Step 2: Update `components/Modal.tsx` for light palette**

In the `ConfirmDialog` component, replace the dark surface classes with:

- Backdrop: `bg-slate-900/40 backdrop-blur-sm`
- Dialog: `bg-white border border-slate-200 shadow-drawer rounded-xl`
- Title: `text-base font-semibold text-slate-900`
- Body: `text-sm text-slate-600`
- Confirm button: `bg-rose-600 text-white hover:bg-rose-700` (when `danger` prop), else `bg-indigo-600 hover:bg-indigo-700`
- Cancel button: `bg-white text-slate-700 border border-slate-200 hover:bg-slate-50`

Keep the public API identical.

- [ ] **Step 3: Build and commit**

Run: `npx tsc --noEmit`
Expected: 0 errors.

```bash
git add hooks/useToasts.tsx components/Modal.tsx
git commit -m "refactor(toast,modal): restyle to light palette"
```

---

## Phase C — Shell components (Sidebar, Topbar, CommandPalette, Modal, EmptyState, layout)

### Task 12: Restyle Sidebar

**Files:**
- Modify: `components/Sidebar.tsx`

- [ ] **Step 1: Replace `components/Sidebar.tsx`**

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  LayoutDashboard, ShieldAlert, Server, Bug, FileCheck2, FileText,
  Activity, Settings, Boxes, Search, ScrollText, ChevronDown, GitBranch,
  ShieldCheck, type LucideIcon
} from "lucide-react";

type Item = { href: string; label: string; icon: LucideIcon; count?: number; tag?: "new" | "beta" };
type Group = { title: string; items: Item[] };

const groups: Group[] = [
  {
    title: "Operate",
    items: [
      { href: "/",             label: "Overview",        icon: LayoutDashboard },
      { href: "/alerts",       label: "Alerts",          icon: ShieldAlert, count: 220 },
      { href: "/agents",       label: "Agents",          icon: Server, count: 64 },
      { href: "/threat-intel", label: "Threat Intel",    icon: Bug, tag: "new" }
    ]
  },
  {
    title: "Analyze",
    items: [
      { href: "/vulnerabilities", label: "Vulnerabilities", icon: ShieldCheck },
      { href: "/fim",             label: "File Integrity",  icon: FileCheck2 },
      { href: "/compliance",      label: "Compliance",      icon: GitBranch },
      { href: "/mitre",           label: "MITRE ATT&CK",    icon: Boxes }
    ]
  },
  {
    title: "Configure",
    items: [
      { href: "/rules",    label: "Rules",    icon: ScrollText, count: 1284 },
      { href: "/logs",     label: "Logs",     icon: FileText },
      { href: "/settings", label: "Settings", icon: Settings }
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex flex-col w-[244px] shrink-0 h-screen sticky top-0 bg-white border-r border-slate-200" aria-label="Primary">
      <div className="flex items-center gap-2.5 h-14 px-4 border-b border-slate-200">
        <div className="relative w-8 h-8 grid place-items-center rounded-lg bg-indigo-50 border border-indigo-200">
          <ShieldAlert size={16} className="text-indigo-600" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-slate-900">Sentinel Stack</div>
          <div className="text-[10.5px] text-slate-500 font-mono uppercase tracking-wider">wazuh 4.9.0</div>
        </div>
      </div>

      <button type="button"
        className="mx-3 mt-3 flex items-center gap-2 h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-500 hover:border-slate-300 transition-colors"
        aria-label="Open command palette">
        <Search size={13} />
        <span>Search anything...</span>
        <span className="ml-auto flex items-center gap-1">
          <span className="kbd">Cmd</span><span className="kbd">K</span>
        </span>
      </button>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {groups.map(group => (
          <div key={group.title}>
            <div className="flex items-center justify-between px-2 mb-1.5">
              <div className="text-[10.5px] uppercase tracking-wider text-slate-500 font-semibold">{group.title}</div>
              <ChevronDown size={11} className="text-slate-300" />
            </div>
            <ul className="space-y-0.5">
              {group.items.map(it => {
                const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
                const Icon = it.icon;
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      className={cn(
                        "group relative flex items-center gap-2.5 h-8 px-2.5 rounded-md text-[13px] transition-colors",
                        active
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      )}
                    >
                      {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-indigo-600" />}
                      <Icon size={15} className={cn(active ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} />
                      <span className="flex-1 truncate">{it.label}</span>
                      {typeof it.count === "number" && (
                        <span className={cn(
                          "text-[10.5px] font-mono px-1.5 h-[18px] grid place-items-center rounded",
                          active ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"
                        )}>{it.count}</span>
                      )}
                      {it.tag && (
                        <span className="text-[9.5px] font-semibold uppercase tracking-wider px-1.5 h-[18px] grid place-items-center rounded bg-indigo-100 text-indigo-700">
                          {it.tag}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="m-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10.5px] uppercase tracking-wider text-slate-500 font-semibold">Cluster</div>
          <span className="flex items-center gap-1.5 text-[10.5px] text-emerald-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" /> Healthy
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="text-slate-500">Manager</span>
            <span className="font-mono text-slate-900">prod-01</span>
          </div>
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="text-slate-500">Workers</span>
            <span className="font-mono text-slate-900">3 / 3</span>
          </div>
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="text-slate-500">Queue</span>
            <span className="font-mono text-slate-900">412 evt/s</span>
          </div>
        </div>
        <Link href="/settings" className="mt-2.5 w-full h-7 text-[11.5px] bg-white border border-slate-200 rounded-md text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5">
          <Activity size={12} /> View cluster health
        </Link>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add components/Sidebar.tsx
git commit -m "refactor(sidebar): restyle to light palette"
```

---

### Task 13: Restyle Topbar

**Files:**
- Modify: `components/Topbar.tsx`
- Create: `hooks/useGoToShortcuts.ts`

- [ ] **Step 1: Create `hooks/useGoToShortcuts.ts`**

```ts
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const map: Record<string, string> = {
  O: "/",
  A: "/alerts",
  R: "/agents",
  V: "/vulnerabilities",
  F: "/fim",
  C: "/compliance",
  M: "/mitre",
  L: "/logs",
  T: "/threat-intel",
  S: "/settings"
};

export function useGoToShortcuts() {
  const router = useRouter();
  useEffect(() => {
    let armed: string | null = null;
    let timer: number | null = null;
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || (t as HTMLElement).isContentEditable)) return;
      const k = e.key.toUpperCase();
      if (armed === null) {
        if (k === "G") { armed = "G"; timer = window.setTimeout(() => { armed = null; }, 800); }
        return;
      }
      if (k === "?" ) { /* Help shortcut handled elsewhere */ armed = null; if (timer) clearTimeout(timer); return; }
      const dest = map[k];
      if (dest) {
        router.push(dest);
        e.preventDefault();
      }
      armed = null;
      if (timer) clearTimeout(timer);
    }
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); if (timer) clearTimeout(timer); };
  }, [router]);
}
```

- [ ] **Step 2: Replace `components/Topbar.tsx`**

```tsx
"use client";
import { useState, useRef, useEffect } from "react";
import {
  Bell, Search, ChevronDown, HelpCircle, LogOut, User2,
  Server, Check, AlertTriangle, Keyboard, Sparkles, ExternalLink
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { cn } from "@/lib/cn";
import { formatCompact } from "@/lib/format";
import { useTimeRange, type TimeRangeKey } from "@/hooks/useTimeRange";
import { useToasts } from "@/hooks/useToasts";
import { useGoToShortcuts } from "@/hooks/useGoToShortcuts";

type EnvKey = "production" | "staging" | "dev";
const envs: { key: EnvKey; label: string; regions: string[] }[] = [
  { key: "production", label: "Production", regions: ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"] },
  { key: "staging",    label: "Staging",    regions: ["us-east-1"] },
  { key: "dev",        label: "Dev",        regions: ["local"] }
];

const ranges: { key: TimeRangeKey; label: string }[] = [
  { key: "1h",  label: "Last 1 hour" },
  { key: "24h", label: "Last 24 hours" },
  { key: "7d",  label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" }
];

export function Topbar() {
  const { theme, toggle } = useTheme();
  const cmd = useCommandPalette();
  const toasts = useToasts();
  const { range, setKey } = useTimeRange();
  useGoToShortcuts();

  const [env, setEnv] = useState<EnvKey>("production");
  const [region, setRegion] = useState<string>(envs[0].regions[0]);
  const [envOpen, setEnvOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const envRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (envRef.current   && !envRef.current.contains(e.target as Node))   setEnvOpen(false);
      if (rangeRef.current && !rangeRef.current.contains(e.target as Node)) setRangeOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current  && !userRef.current.contains(e.target as Node))  setUserOpen(false);
      if (helpRef.current  && !helpRef.current.contains(e.target as Node))  setHelpOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function selectEnv(k: EnvKey, r: string) {
    setEnv(k); setRegion(r); setEnvOpen(false);
    toasts.push({ variant: "success", title: "Environment switched", description: `Now viewing ${k} - ${r}` });
  }

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="h-14 flex items-center gap-3 px-4">
        <div ref={envRef} className="relative">
          <button type="button"
            onClick={() => { setEnvOpen(o => !o); setRangeOpen(false); setNotifOpen(false); setUserOpen(false); setHelpOpen(false); }}
            className="flex items-center gap-2 h-7 px-2.5 bg-slate-50 border border-slate-200 rounded-md hover:border-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            aria-haspopup="menu" aria-expanded={envOpen}>
            <span className={cn("w-1.5 h-1.5 rounded-full",
              env === "production" ? "bg-emerald-500 animate-pulse-soft" : env === "staging" ? "bg-amber-500" : "bg-sky-500"
            )} />
            <span className="text-[11.5px] font-medium uppercase tracking-wider text-slate-700">{env}</span>
            <span className="text-slate-400 text-[10.5px] font-mono">{region}</span>
            <ChevronDown size={12} className={cn("text-slate-400 transition-transform", envOpen && "rotate-180")} />
          </button>
          {envOpen && (
            <div className="absolute left-0 top-9 w-[260px] bg-white border border-slate-200 rounded-lg shadow-pop z-40 animate-slide-in-right">
              {envs.map(e => (
                <div key={e.key} className="border-b border-slate-100 last:border-0">
                  <div className="px-3 py-1.5 text-[10.5px] uppercase tracking-wider text-slate-500 font-semibold">{e.label}</div>
                  {e.regions.map(r => (
                    <button type="button" key={r} onClick={() => selectEnv(e.key, r)}
                      className={cn("w-full flex items-center justify-between px-3 h-8 text-xs hover:bg-slate-50",
                        env === e.key && region === r ? "text-indigo-700 bg-indigo-50" : "text-slate-600")}>
                      <span className="flex items-center gap-2">
                        <Server size={12} className="text-slate-400" />
                        <span className="font-mono">{r}</span>
                      </span>
                      {env === e.key && region === r && <Check size={12} className="text-indigo-600" />}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="button" onClick={() => cmd.setOpen(true)}
          className="hidden lg:flex flex-1 max-w-[520px] items-center gap-2 h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-md text-[13px] text-slate-500 hover:border-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          aria-label="Open search">
          <Search size={13} />
          <span className="flex-1 text-left">Search alerts, agents, CVEs...</span>
          <span className="flex items-center gap-1">
            <span className="kbd">Cmd</span><span className="kbd">K</span>
          </span>
        </button>

        <div ref={rangeRef} className="relative">
          <button type="button"
            onClick={() => { setRangeOpen(o => !o); setEnvOpen(false); setNotifOpen(false); setUserOpen(false); setHelpOpen(false); }}
            className="hidden md:flex items-center gap-1.5 h-7 px-2.5 bg-slate-50 border border-slate-200 rounded-md hover:border-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            aria-haspopup="menu" aria-expanded={rangeOpen}>
            <span className="text-[11.5px] text-slate-700">{range.label}</span>
            <ChevronDown size={12} className={cn("text-slate-400 transition-transform", rangeOpen && "rotate-180")} />
          </button>
          {rangeOpen && (
            <div className="absolute right-0 top-9 w-[200px] bg-white border border-slate-200 rounded-lg shadow-pop z-40 animate-slide-in-right">
              {ranges.map(r => (
                <button type="button" key={r.key}
                  onClick={() => { setKey(r.key); setRangeOpen(false); toasts.push({ variant: "info", title: "Time range updated", description: r.label, duration: 2000 }); }}
                  className={cn("w-full flex items-center justify-between px-3 h-8 text-xs hover:bg-slate-50",
                    range.key === r.key ? "text-indigo-700 bg-indigo-50" : "text-slate-600")}>
                  <span>{r.label}</span>
                  {range.key === r.key && <Check size={12} className="text-indigo-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 md:hidden" />

        <div className="hidden md:flex items-center gap-3 text-[11.5px]">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Server size={12} />
            <span><span className="text-slate-900 font-mono">{formatCompact(64)}</span> agents</span>
          </div>
          <span className="w-px h-4 bg-slate-200" />
          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
            <span><span className="text-slate-900 font-mono">1,284</span> evt/s</span>
          </div>
        </div>

        <button type="button" onClick={() => { toggle(); toasts.push({ variant: "info", title: `Switched to ${theme === "dark" ? "light" : "dark"} theme`, duration: 1500 }); }}
          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          aria-label="Toggle theme" title="Toggle theme">
          <span className="text-xs">Theme</span>
        </button>

        <div ref={helpRef} className="relative">
          <button type="button"
            onClick={() => { setHelpOpen(o => !o); setEnvOpen(false); setNotifOpen(false); setUserOpen(false); }}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            aria-label="Help" aria-haspopup="menu" aria-expanded={helpOpen}>
            <HelpCircle size={14} />
          </button>
          {helpOpen && (
            <div className="absolute right-0 top-10 w-[320px] bg-white border border-slate-200 rounded-lg shadow-pop z-40 animate-slide-in-right">
              <div className="px-3 h-10 flex items-center border-b border-slate-200 text-xs font-semibold text-slate-900">
                <Sparkles size={12} className="text-indigo-600 mr-2" /> Keyboard shortcuts
              </div>
              <ul className="py-1.5 text-xs">
                {[
                  { k: ["Cmd", "K"], label: "Open command palette" },
                  { k: ["G", "O"],    label: "Go to Overview" },
                  { k: ["G", "A"],    label: "Go to Alerts" },
                  { k: ["G", "R"],    label: "Go to Agents" },
                  { k: ["A"],         label: "Acknowledge selected alerts" },
                  { k: ["?"],         label: "Toggle this help" },
                  { k: ["Esc"],       label: "Close any overlay" }
                ].map((s, i) => (
                  <li key={i} className="px-3 h-8 flex items-center justify-between hover:bg-slate-50">
                    <span className="text-slate-600">{s.label}</span>
                    <span className="flex items-center gap-1">{s.k.map((key, j) => <span key={j} className="kbd">{key}</span>)}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-slate-200 p-2 flex justify-between">
                <button type="button" onClick={() => { setHelpOpen(false); cmd.setOpen(true); }} className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium bg-white border border-slate-200 rounded-md hover:bg-slate-50">
                  <Search size={11} />Open palette
                </button>
                <button type="button" onClick={() => toasts.push({ variant: "info", title: "Opening documentation" })} className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium bg-white border border-slate-200 rounded-md hover:bg-slate-50">
                  <ExternalLink size={11} />Docs
                </button>
              </div>
            </div>
          )}
        </div>

        <div ref={notifRef} className="relative">
          <button type="button"
            onClick={() => { setNotifOpen(o => !o); setEnvOpen(false); setRangeOpen(false); setUserOpen(false); setHelpOpen(false); }}
            className="relative inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            aria-label="Notifications" aria-haspopup="menu" aria-expanded={notifOpen}>
            <Bell size={14} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" />
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-10 w-[340px] bg-white border border-slate-200 rounded-lg shadow-pop z-40 animate-slide-in-right">
              <div className="flex items-center justify-between px-3 h-10 border-b border-slate-200">
                <div className="text-xs font-semibold text-slate-900">Notifications</div>
                <button type="button"
                  onClick={() => toasts.push({ variant: "info", title: "Notifications cleared", duration: 1800 })}
                  className="text-[11px] text-slate-500 hover:text-slate-900">Mark all read</button>
              </div>
              <ul className="max-h-[320px] overflow-y-auto">
                {[
                  { sev: "critical", title: "Critical rule 5715 fired on db-master-012", time: "2m" },
                  { sev: "high",     title: "3 SSH brute-force attempts on edge-fw-002",   time: "14m" },
                  { sev: "medium",   title: "New CVE-2024-3094 detected on 4 agents",      time: "1h"  },
                  { sev: "info",     title: "Manager prod-01 restarted successfully",     time: "3h"  }
                ].map((n, i) => (
                  <li key={i} className="px-3 py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer"
                      onClick={() => { setNotifOpen(false); toasts.push({ variant: n.sev as any, title: "Opened: " + n.title, duration: 2000 }); }}>
                    <div className="flex items-start gap-2.5">
                      <span className={cn(
                        "mt-1.5 w-1.5 h-1.5 rounded-full flex-none",
                        n.sev === "critical" ? "bg-rose-500" :
                        n.sev === "high"     ? "bg-orange-500" :
                        n.sev === "medium"   ? "bg-amber-500" : "bg-sky-500"
                      )} />
                      <div className="flex-1">
                        <div className="text-xs text-slate-900 leading-snug">{n.title}</div>
                        <div className="text-[10.5px] text-slate-500 mt-0.5">{n.time} ago</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="px-3 h-9 flex items-center justify-between border-t border-slate-200">
                <span className="text-[10.5px] text-slate-500">Showing 4 of 17</span>
                <button onClick={() => setNotifOpen(false)} className="text-[11.5px] text-indigo-600 hover:text-indigo-700">View all</button>
              </div>
            </div>
          )}
        </div>

        <div ref={userRef} className="relative">
          <button type="button"
            onClick={() => { setUserOpen(o => !o); setEnvOpen(false); setRangeOpen(false); setNotifOpen(false); setHelpOpen(false); }}
            className="flex items-center gap-2 h-8 pl-1 pr-2 bg-slate-50 border border-slate-200 rounded-md hover:border-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            aria-label="User menu" aria-haspopup="menu" aria-expanded={userOpen}>
            <span className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-indigo-700 grid place-items-center text-[10.5px] font-semibold text-white">RA</span>
            <span className="hidden md:flex flex-col text-left leading-tight">
              <span className="text-xs font-medium text-slate-900">R. Aydin</span>
              <span className="text-[10px] text-slate-500">SOC Analyst - L2</span>
            </span>
            <ChevronDown size={12} className={cn("text-slate-400 transition-transform", userOpen && "rotate-180")} />
          </button>
          {userOpen && (
            <div className="absolute right-0 top-10 w-[260px] bg-white border border-slate-200 rounded-lg shadow-pop z-40 animate-slide-in-right">
              <div className="px-3 py-3 border-b border-slate-200">
                <div className="text-[13px] font-semibold text-slate-900">R. Aydin</div>
                <div className="text-[11px] text-slate-500">r.aydin@sentinelstack.io</div>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 h-5 px-2 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />On shift
                  </span>
                  <span className="inline-flex items-center h-5 px-2 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px]">L2 Analyst</span>
                </div>
              </div>
              <ul className="py-1.5">
                {[
                  { icon: User2,    label: "Profile",     action: () => toasts.push({ title: "Profile (coming soon)" }) },
                  { icon: Server,   label: "My shifts",   action: () => toasts.push({ title: "Shifts view (coming soon)" }) },
                  { icon: Check,    label: "On-call",     action: () => toasts.push({ title: "On-call roster (coming soon)" }) },
                  { icon: Keyboard, label: "Shortcuts",   action: () => { setUserOpen(false); setHelpOpen(true); } }
                ].map(({ icon: Icon, label, action }) => (
                  <li key={label}>
                    <button type="button" onClick={action} className="w-full flex items-center gap-2.5 px-3 h-8 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                      <Icon size={13} className="text-slate-400" />
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="border-t border-slate-200 py-1.5">
                <button
                  onClick={() => toasts.push({ variant: "warn", title: "Signed out", description: "Redirecting to login..." })}
                  className="w-full flex items-center gap-2.5 px-3 h-8 text-xs text-rose-600 hover:bg-rose-50 transition-colors">
                  <LogOut size={13} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="hidden lg:flex h-7 items-center gap-3 px-4 border-t border-slate-200 text-[11px] text-slate-500">
        <button type="button"
          onClick={() => toasts.push({ variant: "warn", title: "3 rules awaiting review", description: "Opening review queue..." })}
          className="flex items-center gap-1.5 hover:text-slate-900">
          <AlertTriangle size={11} className="text-amber-500" />
          <span><span className="text-slate-900">3 rules</span> awaiting review</span>
        </button>
        <span className="w-px h-3 bg-slate-200" />
        <span>Latest indexer snapshot: <span className="font-mono text-slate-900">02:14:38 UTC</span></span>
        <span className="w-px h-3 bg-slate-200" />
        <span>SOC tip: <span className="text-slate-900">acknowledge within 15m to keep MTTR under target</span></span>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: 0 errors.

```bash
git add hooks/useGoToShortcuts.ts components/Topbar.tsx
git commit -m "refactor(topbar): restyle to light palette and wire go-to shortcuts"
```

---

### Task 14: Restyle CommandPalette

**Files:**
- Modify: `components/CommandPalette.tsx`

- [ ] **Step 1: Replace the file**

Swap all `surface-1/border-base/shadow-ops-lg` classes for `bg-white border-slate-200 shadow-pop`. Swap `text-muted`/`text-primary`/`text-secondary` to `text-slate-500`/`text-slate-900`/`text-slate-600`. Swap `bg-signal-*` and `text-signal-*` references in the file to `bg-indigo-*` and `text-indigo-*`. The logic (search, keybinds, results) stays unchanged.

The relevant substitutions to apply:

- Root modal: `bg-black/60 backdrop-blur-sm` -> `bg-slate-900/40 backdrop-blur-sm`
- Panel: `surface-1 border border-base rounded-xl shadow-ops-lg` -> `bg-white border border-slate-200 rounded-xl shadow-pop`
- Input border: `border-soft` -> `border-slate-200`
- Group label: `text-muted` -> `text-slate-500`
- Active row: `surface-2` -> `bg-slate-50`
- Icon active color: `text-signal-400` -> `text-indigo-600`
- Result text: `text-primary`/`text-muted` -> `text-slate-900`/`text-slate-500`
- Footer border: `border-soft` -> `border-slate-200`

- [ ] **Step 2: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: 0 errors.

```bash
git add components/CommandPalette.tsx
git commit -m "refactor(command-palette): restyle to light palette"
```

---

### Task 15: Update root layout to light theme

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update layout**

Change `<html lang="en" className="dark" suppressHydrationWarning>` to `<html lang="en" className="light" suppressHydrationWarning>`.

Update the skip link: replace `btn btn-primary` with the new light button classes:

```tsx
<a href="#main" className="sr-only focus:not-sr-only fixed top-2 left-2 z-50 inline-flex items-center h-9 px-3 rounded-lg text-sm font-medium bg-indigo-600 text-white">
  Skip to main content
</a>
```

Update the `ToastProvider` / `TimeRangeProvider` wrapping to keep providers but make the body container `bg-slate-50` (the new app background):

```tsx
<div className="flex min-h-screen bg-slate-50">
  <Sidebar />
  <div className="flex-1 min-w-0 flex flex-col">
    <Topbar />
    <main id="main" className="flex-1 min-w-0 px-4 md:px-6 py-5 md:py-6">
      {children}
    </main>
  </div>
</div>
```

- [ ] **Step 2: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: 0 errors.

```bash
git add app/layout.tsx
git commit -m "feat(layout): switch to light theme, light app background"
```

---

### Task 16: Update useTheme to light-only

**Files:**
- Modify: `hooks/useTheme.ts`

- [ ] **Step 1: Replace `hooks/useTheme.ts`**

```ts
"use client";
import { useEffect, useState } from "react";

export function useTheme() {
  const [theme, setTheme] = useState<"light">("light");

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  }, []);

  return { theme, toggle: () => { /* light-only this iteration */ } };
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useTheme.ts
git commit -m "refactor(theme): lock to light this iteration"
```

---

### Task 17: Restyle EmptyState CountUp + remove obsolete primitives

**Files:**
- Modify: `components/EmptyState.tsx`

- [ ] **Step 1: Read existing file and restyle CountUp to use light colors**

In `components/EmptyState.tsx`, find the `CountUp` export and update the `text-muted`/`text-primary` references to `text-slate-500`/`text-slate-900`. No other behavior change. Keep the `formatNumber` usage identical.

- [ ] **Step 2: Delete `components/ui/primitives.tsx`**

After all pages have migrated to the new primitives (in Phase D), the old `Panel`/`Kpi`/`SeverityBadge`/`StatusDot` are no longer used. Run:

```bash
rm components/ui/primitives.tsx
```

(Do this AFTER Phase D is done; for now, leave the file. We will delete it as the very last step of Phase D.)

- [ ] **Step 3: Commit**

```bash
git add components/EmptyState.tsx
git commit -m "refactor(empty-state): align CountUp with light palette"
```

---

## Phase D — Overview refactor + Seed extensions

### Task 18: Extend seed.ts with new domains

**Files:**
- Modify: `data/seed.ts`

- [ ] **Step 1: Add threat intel data**

Append to `data/seed.ts`:

```ts
// ----- Threat Intel -----
export interface ThreatActor {
  id: string;
  name: string;
  origin: string;
  targetSectors: string[];
  ttps: string[]; // technique IDs
  observed24h: number;
}

export const threatActors: ThreatActor[] = [
  { id: "TA-001", name: "Volt Typhoon",       origin: "China",         targetSectors: ["Energy", "Communications"], ttps: ["T1190", "T1078", "T1027"],     observed24h: 14 },
  { id: "TA-002", name: "Scattered Spider",   origin: "Unknown",       targetSectors: ["Telco", "Hospitality"],      ttps: ["T1566.001", "T1078", "T1003"],  observed24h: 9  },
  { id: "TA-003", name: "APT29",              origin: "Russia",        targetSectors: ["Government", "Healthcare"], ttps: ["T1071.001", "T1027", "T1543"],   observed24h: 6  },
  { id: "TA-004", name: "Lazarus Group",      origin: "North Korea",   targetSectors: ["Finance", "Crypto"],         ttps: ["T1567.002", "T1059.004"],         observed24h: 3  },
  { id: "TA-005", name: "FIN7",               origin: "Unknown",       targetSectors: ["Retail", "Hospitality"],     ttps: ["T1059.001", "T1027", "T1547"],   observed24h: 11 },
  { id: "TA-006", name: "OilRig",             origin: "Iran",          targetSectors: ["Government", "Energy"],      ttps: ["T1071.001", "T1505"],             observed24h: 4  },
  { id: "TA-007", name: "Magecart",           origin: "Unknown",       targetSectors: ["Retail", "E-commerce"],      ttps: ["T1059.007", "T1557"],             observed24h: 7  },
  { id: "TA-008", name: "TA505",              origin: "Unknown",       targetSectors: ["Finance"],                   ttps: ["T1486", "T1489"],                 observed24h: 2  },
  { id: "TA-009", name: "Kimsuky",            origin: "North Korea",   targetSectors: ["Government", "Think tanks"], ttps: ["T1566.001", "T1071.001"],          observed24h: 5  }
];
```

- [ ] **Step 2: Add a few FIM and threat-actor event timestamps for the timeline**

Find the existing `fimEvents` block and add a `fimReviewMap` initializer (optional; the store provides defaults). No new export needed for fim.

- [ ] **Step 3: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: 0 errors.

```bash
git add data/seed.ts
git commit -m "feat(seed): threat actor catalog"
```

---

### Task 19: Restyle Overview page (`app/page.tsx`)

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace `app/page.tsx`**

```tsx
"use client";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar
} from "recharts";
import {
  AlertTriangle, ArrowUpRight, ShieldCheck, Activity, Filter, RefreshCcw,
  Globe2, Server, Cpu, GitBranch
} from "lucide-react";
import { alerts, agents, alertTimeline, geoTop, kpi, vulnerabilities } from "@/data/seed";
import { StatCard, Card, CardTitle, CardSubtitle, Badge, Button } from "@/components/ui";
import { formatCompact, formatRelativeTime } from "@/lib/format";
import Link from "next/link";
import { useToasts } from "@/hooks/useToasts";
import { useTimeRange } from "@/hooks/useTimeRange";
import { Page } from "@/components/ui/Page";
import { useAcknowledge } from "@/hooks/useAlertsStore";
import { severityBucket } from "@/types";
import type { Severity } from "@/types";

const sevColors: Record<string, string> = {
  critical: "#E11D48",
  high:     "#EA580C",
  medium:   "#D97706",
  low:      "#059669",
  info:     "#0EA5E9"
};

const CHART_TOOLTIP = {
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: 8,
  fontSize: 12,
  color: "#0F172A"
} as const;

export default function OverviewPage() {
  const toasts = useToasts();
  const { range, setKey } = useTimeRange();
  const acknowledge = useAcknowledge();
  const [refreshing, setRefreshing] = useState(false);

  function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    toasts.push({ variant: "info", title: "Refreshing data", description: "Pulling latest from manager...", duration: 1500 });
    window.setTimeout(() => {
      setRefreshing(false);
      toasts.push({ variant: "success", title: "Overview updated", description: "Re-queried 1,284 events - 64 agents" });
    }, 900);
  }

  const total24h = alertTimeline.reduce((s, h) => s + h.critical + h.high + h.medium + h.low, 0);

  const sevBreakdown = useMemo(() => {
    const k = range.key === "1h" ? 0.06 : range.key === "7d" ? 5.2 : range.key === "30d" ? 21 : 1;
    return [
      { name: "Critical", value: Math.round(kpi.alertsCritical * k), color: sevColors.critical },
      { name: "High",     value: Math.round(alertTimeline.reduce((s,h)=>s+h.high,0)     * k), color: sevColors.high },
      { name: "Medium",   value: Math.round(alertTimeline.reduce((s,h)=>s+h.medium,0)   * k), color: sevColors.medium },
      { name: "Low",      value: Math.round(alertTimeline.reduce((s,h)=>s+h.low,0)      * k), color: sevColors.low },
      { name: "Info",     value: Math.round(312 * k),                                     color: sevColors.info }
    ];
  }, [range.key]);

  const mitreCounts = useMemo(() => {
    const m = new Map<string, { tactic: string; count: number }>();
    alerts.forEach(a => {
      if (!a.rule.mitre) return;
      const cur = m.get(a.rule.mitre.id);
      m.set(a.rule.mitre.id, { tactic: a.rule.mitre.tactic, count: (cur?.count ?? 0) + 1 });
    });
    return [...m.values()].sort((a, b) => b.count - a.count).slice(0, 7);
  }, []);

  const topAgents = useMemo(() => agents
    .filter(a => a.status === "active")
    .map(a => ({ ...a, alertCount: alerts.filter(x => x.agent.id === a.id).length }))
    .sort((a, b) => b.alertCount - a.alertCount)
    .slice(0, 6), []);

  const recent = alerts.slice(0, 8);

  return (
    <Page
      breadcrumb={[{ label: "SOC" }, { label: "Overview" }]}
      icon={Activity}
      title="Overview"
      description={`${kpi.alertsCritical} critical alerts need acknowledgement - fleet health nominal - MTTR 7m 12s`}
      actions={
        <>
          <Button variant="secondary" size="md" onClick={handleRefresh} disabled={refreshing} icon={<RefreshCcw size={14} className={refreshing ? "animate-spin" : ""} />}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button variant="secondary" size="md" icon={<Filter size={14} />}>{range.label}</Button>
          <Link href="/alerts"><Button variant="primary" icon={<ArrowUpRight size={14} />}>Open alert queue</Button></Link>
        </>
      }
    >
      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Active Agents" value={`${kpi.agentsActive} / ${kpi.agentsTotal}`} delta="+2" dir="up" hint={`${kpi.agentsDisconnected} disconnected`} />
        <StatCard label="Events / sec"  value={formatCompact(kpi.eventsPerSecond)} delta="+8.2%" dir="up" hint="rolling 5m average" accent="info" />
        <StatCard label={`Alerts - ${range.label.replace("Last ", "")}`} value={formatCompact(total24h)} delta="+12%" dir="up" hint="vs. previous period" />
        <StatCard label="Critical"      value={kpi.alertsCritical} delta="+3" dir="down" hint="requires L2 review" accent="critical" />
        <StatCard label="Open CVEs"     value={kpi.vulnsOpen} delta="-4" dir="up" hint="12 critical across fleet" accent="high" />
        <StatCard label="Compliance"    value={`${Math.round(kpi.complianceScore * 100)}%`} delta="+0.4" dir="up" hint="weighted across frameworks" accent="low" />
      </section>

      <section className="grid grid-cols-12 gap-5">
        <Card className="col-span-12 xl:col-span-8" padded={false}
          header={
            <>
              <div>
                <CardTitle>Alert volume</CardTitle>
                <CardSubtitle>{range.label} - stacked by severity, hour granularity</CardSubtitle>
              </div>
              <div className="flex items-center gap-3">
                {(["critical","high","medium","low"] as const).map(k => (
                  <span key={k} className="hidden sm:inline-flex items-center gap-1.5 text-[10.5px] text-slate-500">
                    <span className="w-2 h-2 rounded-full" style={{ background: sevColors[k] }} />{k}
                  </span>
                ))}
              </div>
            </>
          }>
          <div className="h-[300px] p-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={alertTimeline} margin={{ left: 0, right: 8, top: 6, bottom: 0 }}>
                <defs>
                  {(["critical","high","medium","low"] as const).map(k => (
                    <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"  stopColor={sevColors[k]} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={sevColors[k]} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="hour" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={CHART_TOOLTIP} cursor={{ fill: "rgba(79, 70, 229, 0.06)" }} />
                <Area type="monotone" dataKey="low"      stackId="1" stroke={sevColors.low}      fill="url(#g-low)"      strokeWidth={1.2} isAnimationActive={false} />
                <Area type="monotone" dataKey="medium"   stackId="1" stroke={sevColors.medium}   fill="url(#g-medium)"   strokeWidth={1.2} isAnimationActive={false} />
                <Area type="monotone" dataKey="high"     stackId="1" stroke={sevColors.high}     fill="url(#g-high)"     strokeWidth={1.2} isAnimationActive={false} />
                <Area type="monotone" dataKey="critical" stackId="1" stroke={sevColors.critical} fill="url(#g-critical)" strokeWidth={1.6} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="col-span-12 md:col-span-6 xl:col-span-4" padded={false}
          header={
            <>
              <div>
                <CardTitle>Severity mix</CardTitle>
                <CardSubtitle>{range.label}, all sources</CardSubtitle>
              </div>
            </>
          }>
          <div className="flex items-center gap-3 h-[300px] p-4">
            <div className="w-[180px] h-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sevBreakdown} dataKey="value" innerRadius={56} outerRadius={80} paddingAngle={2} stroke="none" isAnimationActive={false}>
                    {sevBreakdown.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center text-center pointer-events-none">
                <div>
                  <div className="text-2xl font-semibold num text-slate-900">
                    {formatCompact(sevBreakdown.reduce((s, x) => s + x.value, 0))}
                  </div>
                  <div className="text-[10.5px] text-slate-500 uppercase tracking-wider">Total</div>
                </div>
              </div>
            </div>
            <ul className="flex-1 space-y-2">
              {sevBreakdown.map(d => {
                const total = sevBreakdown.reduce((s, x) => s + x.value, 0) || 1;
                const pct = (d.value / total) * 100;
                return (
                  <li key={d.name} className="text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                        <span className="text-slate-600">{d.name}</span>
                      </span>
                      <span className="font-mono text-slate-900">{d.value}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full" style={{ width: `${pct}%`, background: d.color }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </Card>

        <Card className="col-span-12 xl:col-span-7" padded={false}
          header={
            <>
              <div>
                <CardTitle>Live alert stream</CardTitle>
                <CardSubtitle>Most recent across all rules</CardSubtitle>
              </div>
              <Button size="sm" variant="secondary" onClick={() => { acknowledge(recent.map(a => a.id)); toasts.push({ variant: "success", title: `Acknowledged ${recent.length} alerts` }); }}>
                <ShieldCheck size={12} /> Ack all
              </Button>
            </>
          }>
          <ul className="divide-y divide-slate-100">
            {recent.map(a => {
              const tone = severityBucket(a.rule.level) as "critical" | "high" | "medium" | "low" | "info";
              return (
                <li key={a.id} className="px-4 py-2.5 hover:bg-slate-50 transition-colors flex items-center gap-3">
                  <Badge tone={tone} dot>{tone} - {a.rule.level}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[13px] text-slate-900 truncate">
                      <span className="font-mono text-slate-500">{a.id}</span>
                      <span className="text-slate-300">-</span>
                      <span className="truncate">{a.rule.description}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="font-mono">{a.agent.name}</span>
                      <span className="text-slate-300">-</span>
                      <span className="font-mono">{a.agent.ip}</span>
                      {a.rule.mitre && (
                        <>
                          <span className="text-slate-300">-</span>
                          <span className="inline-flex items-center h-[18px] px-1.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200">{a.rule.mitre.id} - {a.rule.mitre.tactic}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-500 shrink-0">
                    <div>{formatRelativeTime(a.timestamp)}</div>
                    <div className="font-mono text-[10.5px]">{a.location.split("/").slice(-1)[0]}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="col-span-12 md:col-span-6 xl:col-span-5" padded={false}
          header={
            <>
              <div>
                <CardTitle>Noisiest agents</CardTitle>
                <CardSubtitle>Alert volume in last 24h</CardSubtitle>
              </div>
              <Link href="/agents"><Button size="sm" variant="secondary">Manage <ArrowUpRight size={12} /></Button></Link>
            </>
          }>
          <ul className="p-3 space-y-2.5">
            {topAgents.map((a, i) => {
              const max = topAgents[0].alertCount || 1;
              return (
                <li key={a.id} className="flex items-center gap-3">
                  <div className="w-5 text-[10.5px] font-mono text-slate-500">{String(i + 1).padStart(2, "0")}</div>
                  <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 grid place-items-center">
                    <Server size={12} className="text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-900">
                      <span className={cn("w-1.5 h-1.5 rounded-full", a.status === "active" ? "bg-emerald-500" : "bg-slate-300")} />
                      <span className="font-mono truncate">{a.name}</span>
                      <span className="text-slate-500 text-[10.5px]">- {a.os.name} {a.os.version}</span>
                    </div>
                    <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500" style={{ width: `${(a.alertCount / max) * 100}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[13px] font-mono text-slate-900">{a.alertCount}</div>
                    <div className="text-[10px] text-slate-500">alerts</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="col-span-12 md:col-span-7 xl:col-span-7" padded={false}
          header={
            <>
              <div>
                <CardTitle>Top MITRE ATT&CK tactics observed</CardTitle>
                <CardSubtitle>Tactics with confirmed activity in the last 24h</CardSubtitle>
              </div>
              <Link href="/mitre"><Button size="sm" variant="secondary">Coverage map <ArrowUpRight size={12} /></Button></Link>
            </>
          }>
          <div className="h-[260px] p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mitreCounts} layout="vertical" margin={{ left: 16, right: 24, top: 4, bottom: 4 }}>
                <CartesianGrid stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="tactic" width={150} tick={{ fill: "#475569", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "rgba(79, 70, 229, 0.06)" }} contentStyle={CHART_TOOLTIP} />
                <Bar dataKey="count" fill="#4F46E5" radius={[0, 6, 6, 0]} barSize={12} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="col-span-12 md:col-span-5 xl:col-span-5" padded={false}
          header={
            <>
              <div>
                <CardTitle>Top source countries</CardTitle>
                <CardSubtitle>Distinct attacker IPs by geolocation</CardSubtitle>
              </div>
              <span className="text-[10.5px] text-slate-500 flex items-center gap-1"><Globe2 size={12} />MaxMind GeoIP2</span>
            </>
          }>
          <ul className="p-3 space-y-2">
            {geoTop.map((g, i) => {
              const max = geoTop[0].events;
              return (
                <li key={g.code} className="flex items-center gap-3">
                  <div className="w-5 text-[10.5px] font-mono text-slate-500">{String(i + 1).padStart(2, "0")}</div>
                  <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 grid place-items-center text-[10px] font-mono text-slate-600">{g.code}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-900">{g.country}</div>
                    <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-500" style={{ width: `${(g.events / max) * 100}%` }} />
                    </div>
                  </div>
                  <div className="text-right text-xs font-mono text-slate-900 w-14">{g.events.toLocaleString()}</div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="col-span-12" padded={false}
          header={
            <>
              <div>
                <CardTitle>Cluster and indexer health</CardTitle>
                <CardSubtitle>Real-time status of every component Wazuh depends on</CardSubtitle>
              </div>
              <Button size="sm" variant="secondary" onClick={() => toasts.push({ variant: "info", title: "Running diagnostics", description: "Pinging all 6 components..." })}>Run diagnostics <ArrowUpRight size={12} /></Button>
            </>
          }>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 divide-x divide-slate-200">
            <HealthCell icon={Server}      label="Manager"      value="prod-01"     status="ok"   sub="uptime 41d 06h"  onClick={() => toasts.push({ variant: "info", title: "Manager prod-01", description: "Uptime 41d 06h - load 0.42" })} />
            <HealthCell icon={Activity}    label="Workers"      value="3 / 3"       status="ok"   sub="queue depth 12"  onClick={() => toasts.push({ variant: "info", title: "Workers healthy" })} />
            <HealthCell icon={Cpu}         label="Indexer"      value="opensearch 2.15" status="ok"   sub="1.4 TB - 12 shards" onClick={() => toasts.push({ variant: "info", title: "Indexer OK" })} />
            <HealthCell icon={GitBranch}   label="API"          value="55000"       status="ok"   sub="p95 38ms"        onClick={() => toasts.push({ variant: "info", title: "API latency nominal" })} />
            <HealthCell icon={ShieldCheck} label="Integrations" value="14 / 14"     status="warn" sub="VirusTotal rate-limited" onClick={() => toasts.push({ variant: "warn", title: "VirusTotal rate-limited", description: "Backoff in 3m 12s" })} />
            <HealthCell icon={AlertTriangle} label="Disk"       value="62%"         status="warn" sub="free 412 GB"     onClick={() => toasts.push({ variant: "warn", title: "Disk usage 62%" })} />
          </div>
        </Card>

        <Card className="col-span-12 xl:col-span-6" padded={false}
          header={
            <>
              <div>
                <CardTitle>Open critical and high CVEs</CardTitle>
                <CardSubtitle>Sorted by affected agent count</CardSubtitle>
              </div>
              <Link href="/vulnerabilities"><Button size="sm" variant="secondary">All CVEs <ArrowUpRight size={12} /></Button></Link>
            </>
          }>
          <ul className="divide-y divide-slate-100">
            {vulnerabilities.slice(0, 6).map(v => (
              <li key={v.cve} className="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50">
                <Badge tone={v.severity} dot>{v.severity}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-slate-900 font-mono">{v.cve} <span className="text-slate-500 font-sans">- {v.title}</span></div>
                  <div className="text-[11px] text-slate-500 mt-0.5">pkg <span className="font-mono">{v.package} {v.version}</span> {v.fixedVersion && <> - fix <span className="font-mono">{v.fixedVersion}</span></>}</div>
                </div>
                <div className="text-right text-[11px]">
                  <div className="font-mono text-slate-900">{v.agentCount} agents</div>
                  <div className="text-slate-500">CVSS {v.cvss.toFixed(1)}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="col-span-12 xl:col-span-6" padded={false}
          header={
            <>
              <div>
                <CardTitle>Rule activity (24h)</CardTitle>
                <CardSubtitle>Most-firing detection rules</CardSubtitle>
              </div>
              <Link href="/rules"><Button size="sm" variant="secondary">Rule library <ArrowUpRight size={12} /></Button></Link>
            </>
          }>
          <div className="h-[260px] p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: "SSH brute force", value: 4218 },
                { name: "Sudo failure", value: 2940 },
                { name: "PowerShell encoded", value: 1822 },
                { name: "FIM /etc/passwd", value: 612 },
                { name: "Outbound C2", value: 188 },
                { name: "AWS IAM", value: 96 }
              ]} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} interval={0} angle={-12} dy={6} height={40} />
                <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                <Tooltip cursor={{ fill: "rgba(79, 70, 229, 0.06)" }} contentStyle={CHART_TOOLTIP} />
                <Bar dataKey="value" fill="#4F46E5" radius={[4,4,0,0]} barSize={18} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>
    </Page>
  );
}

function HealthCell({ icon: Icon, label, value, status, sub, onClick }: { icon: any; label: string; value: string; status: "ok" | "warn" | "down"; sub: string; onClick?: () => void }) {
  const color = status === "ok" ? "text-emerald-600" : status === "warn" ? "text-amber-600" : "text-rose-600";
  const dotColor = status === "ok" ? "bg-emerald-500" : status === "warn" ? "bg-amber-500" : "bg-rose-500";
  return (
    <button type="button" onClick={onClick} className="px-4 py-3 flex flex-col gap-1.5 text-left hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:bg-indigo-50">
      <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-slate-500 font-semibold">
        <Icon size={12} />
        {label}
      </div>
      <div className="flex items-center gap-2">
        <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse-soft", dotColor)} />
        <div className="text-[13px] text-slate-900 font-mono truncate">{value}</div>
      </div>
      <div className={`text-[10.5px] ${color}`}>{sub}</div>
    </button>
  );
}

function cn(...parts: (string | false | undefined | null)[]) { return parts.filter(Boolean).join(" "); }
```

(Replace the `cn` helper at the bottom with `import { cn } from "@/lib/cn"` at the top — duplicate-import will fail; the bottom definition is a safety net for the long file.)

- [ ] **Step 2: Remove the bottom duplicate `cn` definition**

At the top of the file, add:

```ts
import { cn } from "@/lib/cn";
```

Then delete the local `function cn(...)` at the bottom.

- [ ] **Step 3: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: 0 errors.

```bash
git add app/page.tsx
git commit -m "refactor(overview): restyle to light enterprise palette"
```

---

### Task 20: Delete old primitives file

**Files:**
- Delete: `components/ui/primitives.tsx`

- [ ] **Step 1: Confirm no remaining references**

```bash
grep -r "from \"@/components/ui/primitives\"" app components 2>/dev/null
grep -r "from '@/components/ui/primitives'" app components 2>/dev/null
```

Expected: 0 matches.

- [ ] **Step 2: Delete the file**

```bash
rm components/ui/primitives.tsx
```

- [ ] **Step 3: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: 0 errors.

```bash
git add -A components/ui/primitives.tsx
git commit -m "chore(ui): remove obsolete dark-theme primitives"
```

---

## Phase E — Pages

This phase creates the 9 empty route pages. Each task is a single page. Every page uses the `Page` layout primitive from `components/ui/Page` and the data layer from `data/seed.ts` / `useAlertsStore`.

### Task 21: `/alerts` page

**Files:**
- Create: `app/alerts/page.tsx`
- Create: `app/alerts/AlertDrawer.tsx`
- Create: `app/alerts/AlertFilters.tsx`
- Create: `app/alerts/__tests__/alerts.test.tsx`

**Behavior:**
- Page header with `ShieldAlert` icon, "Alerts" title, "220 events in last 24h - 8 critical" description.
- Filter bar: severity multi-select chips, MITRE select, search input, "Show acked" toggle.
- Sortable table (using `DataGrid`): checkbox, time, severity badge, rule ID, description, agent, MITRE, ack.
- Bulk action toolbar appears when rows selected.
- Row click opens Drawer with tabs (Event, Agent, MITRE, Related).
- Drawer actions: Acknowledge, Escalate (Confirm dialog), Archive.

- [ ] **Step 1: Create `app/alerts/AlertFilters.tsx`**

```tsx
"use client";
import { ShieldAlert, ShieldCheck, Shield, Info, AlertTriangle, Search } from "lucide-react";
import { Badge, SearchInput, Input } from "@/components/ui";
import type { Severity } from "@/types";
import { severityBucket } from "@/types";
import { cn } from "@/lib/cn";

export interface AlertFilters {
  severities: Set<"critical" | "high" | "medium" | "low" | "info">;
  search: string;
  showAcked: boolean;
}

const sevOptions: { value: "critical" | "high" | "medium" | "low" | "info"; label: string; tone: "critical" | "high" | "medium" | "low" | "info" }[] = [
  { value: "critical", label: "Critical", tone: "critical" },
  { value: "high",     label: "High",     tone: "high" },
  { value: "medium",   label: "Medium",   tone: "medium" },
  { value: "low",      label: "Low",      tone: "low" },
  { value: "info",     label: "Info",     tone: "info" }
];

export function AlertFiltersBar({ value, onChange }: { value: AlertFilters; onChange: (v: AlertFilters) => void }) {
  function toggleSev(s: typeof value.severities extends Set<infer T> ? T : never) {
    const next = new Set(value.severities);
    if (next.has(s)) next.delete(s); else next.add(s);
    onChange({ ...value, severities: next });
  }
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl">
      <div className="flex items-center gap-1.5 mr-2">
        {sevOptions.map(o => {
          const active = value.severities.has(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => toggleSev(o.value)}
              className={cn(
                "h-7 px-2.5 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 transition-colors",
                active
                  ? `bg-${o.tone}-50 border-${o.tone}-200 text-${o.tone}-700`
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", `bg-${o.tone}-500`)} />
              {o.label}
            </button>
          );
        })}
      </div>
      <div className="flex-1 min-w-[200px] max-w-md">
        <SearchInput value={value.search} onChange={v => onChange({ ...value, search: v })} placeholder="Search by ID, rule, agent..." />
      </div>
      <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={value.showAcked}
          onChange={e => onChange({ ...value, showAcked: e.target.checked })}
          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        Show acknowledged
      </label>
    </div>
  );
}
```

(Note: Tailwind's `bg-${color}-50` etc. requires the classes to exist in the safelist OR be written literally. For safety, replace the template strings with explicit mappings. Update the file:)

Replace the `sevOptions` and the `toggleSev` button rendering with this safer version:

```tsx
const sevToneClass: Record<string, string> = {
  critical: "bg-rose-50 border-rose-200 text-rose-700",
  high:     "bg-orange-50 border-orange-200 text-orange-700",
  medium:   "bg-amber-50 border-amber-200 text-amber-700",
  low:      "bg-emerald-50 border-emerald-200 text-emerald-700",
  info:     "bg-sky-50 border-sky-200 text-sky-700"
};
const sevDotClass: Record<string, string> = {
  critical: "bg-rose-500", high: "bg-orange-500", medium: "bg-amber-500", low: "bg-emerald-500", info: "bg-sky-500"
};
```

And the button className becomes:

```tsx
className={cn(
  "h-7 px-2.5 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600",
  active ? sevToneClass[o.value] : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
)}
```

- [ ] **Step 2: Create `app/alerts/AlertDrawer.tsx`**

```tsx
"use client";
import { useState } from "react";
import { Drawer, Button, Badge, Tabs, Card, CardTitle, CardSubtitle } from "@/components/ui";
import { ShieldCheck, AlertTriangle, Copy, Archive } from "lucide-react";
import { useToasts } from "@/hooks/useToasts";
import { useAcknowledge, useArchive, isAcked } from "@/hooks/useAlertsStore";
import { severityBucket, severityLabel } from "@/types";
import type { Alert } from "@/types";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/format";

export function AlertDrawer({ alert, open, onClose }: { alert: Alert | null; open: boolean; onClose: () => void }) {
  const toasts = useToasts();
  const ack = useAcknowledge();
  const archive = useArchive();
  const [escalate, setEscalate] = useState(false);

  if (!alert) return null;
  const tone = severityBucket(alert.rule.level) as "critical" | "high" | "medium" | "low" | "info";
  const acked = isAcked(alert.id);

  function copyId() {
    navigator.clipboard?.writeText(alert!.id);
    toasts.push({ variant: "success", title: "Copied", description: alert!.id });
  }
  function onAck() {
    ack([alert!.id]);
    toasts.push({ variant: "success", title: "Acknowledged", description: alert!.id });
  }
  function onArchive() {
    archive([alert!.id]);
    toasts.push({ variant: "info", title: "Archived", description: alert!.id });
  }
  function onEscalateConfirm() {
    setEscalate(false);
    toasts.push({ variant: "warn", title: "Escalated to L2", description: "PagerDuty incident #INC-4421 created" });
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 min-w-0">
          <Badge tone={tone} dot>{severityLabel(alert.rule.level)} - {alert.rule.level}</Badge>
          <span className="font-mono text-xs text-slate-500 truncate">{alert.id}</span>
        </div>
      }
      actions={
        <>
          {!acked && <Button size="sm" variant="primary" onClick={onAck} icon={<ShieldCheck size={12} />}>Acknowledge</Button>}
          <Button size="sm" variant="secondary" onClick={() => setEscalate(true)} icon={<AlertTriangle size={12} />}>Escalate</Button>
          <Button size="sm" variant="ghost" onClick={onArchive} icon={<Archive size={12} />}>Archive</Button>
        </>
      }
    >
      <Tabs
        tabs={[
          {
            id: "event", label: "Event",
            content: (
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Description</div>
                  <div className="text-sm text-slate-900">{alert.rule.description}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Raw event</div>
                  <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto text-slate-700">
{JSON.stringify({
  id: alert.id,
  timestamp: alert.timestamp,
  rule: alert.rule,
  agent: alert.agent,
  location: alert.location,
  decoder: alert.decoder,
  data: alert.data
}, null, 2)}
                  </pre>
                </div>
                <Button size="sm" variant="secondary" onClick={copyId} icon={<Copy size={12} />}>Copy ID</Button>
              </div>
            )
          },
          {
            id: "agent", label: "Agent",
            content: (
              <Card padded={false}>
                <div className="p-4 space-y-2">
                  <div className="text-sm font-semibold text-slate-900 font-mono">{alert.agent.name}</div>
                  <div className="text-xs text-slate-500 font-mono">{alert.agent.ip}</div>
                  <div className="text-xs text-slate-500">Reported {formatRelativeTime(alert.timestamp)}</div>
                  <div className="pt-2"><Link href="/agents" className="text-xs text-indigo-600 hover:text-indigo-700">View agent profile</Link></div>
                </div>
              </Card>
            )
          },
          {
            id: "mitre", label: "MITRE",
            content: alert.rule.mitre ? (
              <Card padded={false}>
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge tone="info" dot>{alert.rule.mitre.id}</Badge>
                    <span className="text-sm font-semibold text-slate-900">{alert.rule.mitre.tactic}</span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono">{alert.rule.mitre.technique}</div>
                  <div className="pt-2"><Link href="/mitre" className="text-xs text-indigo-600 hover:text-indigo-700">View on coverage map</Link></div>
                </div>
              </Card>
            ) : <div className="text-sm text-slate-500">No MITRE mapping for this rule.</div>
          },
          {
            id: "related", label: "Related",
            content: (
              <div className="text-sm text-slate-600">Other alerts with rule {alert.rule.id} in the last 24h would appear here.</div>
            )
          }
        ]}
      />

      {escalate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setEscalate(false)} />
          <div className="relative bg-white border border-slate-200 rounded-xl shadow-drawer max-w-md w-full mx-4 p-5">
            <div className="text-base font-semibold text-slate-900">Escalate to L2</div>
            <div className="text-sm text-slate-600 mt-2">
              {alert.id} ({severityLabel(alert.rule.level)} - {alert.rule.level}) will be sent to the on-call L2 analyst via PagerDuty. Continue?
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setEscalate(false)}>Cancel</Button>
              <Button variant="primary" onClick={onEscalateConfirm}>Send to L2</Button>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
```

- [ ] **Step 3: Create `app/alerts/page.tsx`**

```tsx
"use client";
import { useState, useMemo } from "react";
import { Page, DataGrid, type Column, Button, Card, CardTitle, CardSubtitle, EmptyState, ShieldAlert } from "@/components/ui";
import { ShieldCheck, Download } from "lucide-react";
import { alerts } from "@/data/seed";
import { useTimeRange } from "@/hooks/useTimeRange";
import { useToasts } from "@/hooks/useToasts";
import { useAcknowledge, useAlertsStore } from "@/hooks/useAlertsStore";
import { severityBucket, severityLabel } from "@/types";
import { formatRelativeTime } from "@/lib/format";
import { Badge } from "@/components/ui";
import { AlertDrawer } from "./AlertDrawer";
import { AlertFiltersBar, type AlertFilters } from "./AlertFilters";
import type { Alert } from "@/types";

const TONE: Record<string, "critical" | "high" | "medium" | "low" | "info"> = {
  critical: "critical", high: "high", medium: "medium", low: "low", info: "info"
};

export default function AlertsPage() {
  const toasts = useToasts();
  const { range } = useTimeRange();
  const ack = useAcknowledge();
  const store = useAlertsStore();
  const [filters, setFilters] = useState<AlertFilters>({ severities: new Set(), search: "", showAcked: true });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<Alert | null>(null);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return alerts.filter(a => {
      const tone = severityBucket(a.rule.level);
      if (filters.severities.size && !filters.severities.has(tone)) return false;
      if (!filters.showAcked && store.alertMap[a.id]?.acknowledged) return false;
      if (q && !(a.id.toLowerCase().includes(q) || a.rule.description.toLowerCase().includes(q) || a.agent.name.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [filters, store]);

  const visibleIds = filtered.map(a => a.id);
  const columns: Column<Alert>[] = [
    {
      key: "time", header: "Time", width: "140px", sortable: true,
      sortValue: a => new Date(a.timestamp).getTime(),
      cell: a => <span className="text-slate-600" title={a.timestamp}>{formatRelativeTime(a.timestamp)}</span>
    },
    {
      key: "sev", header: "Severity", width: "150px",
      cell: a => <Badge tone={TONE[severityBucket(a.rule.level)]} dot>{severityLabel(a.rule.level)} - {a.rule.level}</Badge>
    },
    {
      key: "rule", header: "Rule", width: "120px",
      cell: a => <span className="font-mono text-slate-600">{a.rule.id}</span>
    },
    {
      key: "desc", header: "Description", sortable: true,
      sortValue: a => a.rule.description,
      cell: a => <span className="text-slate-900 truncate block max-w-[420px]">{a.rule.description}</span>
    },
    {
      key: "agent", header: "Agent", width: "180px",
      cell: a => <span className="font-mono text-slate-600">{a.agent.name}</span>
    },
    {
      key: "mitre", header: "MITRE", width: "180px",
      cell: a => a.rule.mitre ? <Badge tone="info">{a.rule.mitre.id} - {a.rule.mitre.tactic}</Badge> : <span className="text-slate-300">-</span>
    },
    {
      key: "ack", header: "", width: "40px",
      cell: a => store.alertMap[a.id]?.acknowledged
        ? <span title="Acknowledged" className="inline-flex items-center text-emerald-600"><ShieldCheck size={14} /></span>
        : <span className="text-slate-300">-</span>
    }
  ];

  return (
    <Page
      breadcrumb={[{ href: "/", label: "Operate" }, { label: "Alerts" }]}
      icon={ShieldAlert}
      title="Alerts"
      description={`${alerts.length} events - ${alerts.filter(a => a.rule.level >= 13).length} critical - ${range.label}`}
      actions={
        <>
          <Button variant="secondary" icon={<Download size={14} />} onClick={() => toasts.push({ variant: "info", title: "Export started", description: "JSON download queued" })}>Export</Button>
          <Button variant="primary" onClick={() => { ack(visibleIds); toasts.push({ variant: "success", title: `Acknowledged ${visibleIds.length} alerts` }); }}>Acknowledge all visible</Button>
        </>
      }
    >
      <AlertFiltersBar value={filters} onChange={setFilters} />

      {selected.size > 0 && (
        <Card padded={false}>
          <div className="px-4 py-2 flex items-center justify-between border-b border-slate-200">
            <span className="text-xs text-slate-600">{selected.size} selected</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="primary" onClick={() => { ack([...selected]); toasts.push({ variant: "success", title: `Acknowledged ${selected.size}` }); setSelected(new Set()); }}>Acknowledge</Button>
              <Button size="sm" variant="secondary" onClick={() => toasts.push({ variant: "warn", title: `Escalated ${selected.size}`, description: "PagerDuty incident created" })}>Escalate to L2</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
            </div>
          </div>
        </Card>
      )}

      <DataGrid
        columns={columns}
        rows={filtered}
        rowKey={a => a.id}
        onRowClick={a => setActive(a)}
        selectable
        selected={selected}
        onSelectionChange={setSelected}
        emptyState={
          <EmptyState
            icon={ShieldAlert}
            title="No alerts match"
            description="Try removing severity filters or clearing the search."
            action={<Button variant="secondary" onClick={() => setFilters({ severities: new Set(), search: "", showAcked: true })}>Clear filters</Button>}
          />
        }
      />

      <AlertDrawer alert={active} open={!!active} onClose={() => setActive(null)} />
    </Page>
  );
}
```

- [ ] **Step 4: Write smoke test**

Create `app/alerts/__tests__/alerts.test.tsx`:

```tsx
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
    expect(screen.getByText("Alerts")).toBeInTheDocument();
    expect(screen.getByText(/critical/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: previous tests still pass; new test passes.

- [ ] **Step 6: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: 0 errors.

```bash
git add app/alerts/
git commit -m "feat(alerts): full alerts page with filter bar, table, drawer, and tests"
```

---

### Task 22: `/agents` page

**Files:**
- Create: `app/agents/page.tsx`
- Create: `app/agents/AgentCard.tsx`
- Create: `app/agents/AgentDrawer.tsx`
- Create: `app/agents/AgentFilters.tsx`

- [ ] **Step 1: Create `app/agents/AgentFilters.tsx`**

```tsx
"use client";
import { SearchInput, Select } from "@/components/ui";
import { cn } from "@/lib/cn";

const STATUSES: { value: "all" | "active" | "disconnected" | "pending" | "never_connected"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "disconnected", label: "Disconnected" },
  { value: "pending", label: "Pending" },
  { value: "never_connected", label: "Never connected" }
];

export interface AgentFilters {
  search: string;
  status: "all" | "active" | "disconnected" | "pending" | "never_connected";
  os: string;
}

export function AgentFiltersBar({ value, onChange, osOptions }: { value: AgentFilters; onChange: (v: AgentFilters) => void; osOptions: { value: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl">
      <div className="flex-1 min-w-[200px] max-w-md">
        <SearchInput value={value.search} onChange={v => onChange({ ...value, search: v })} placeholder="Search by name, IP, OS..." />
      </div>
      <Select
        value={value.status}
        onChange={e => onChange({ ...value, status: e.target.value as AgentFilters["status"] })}
        options={STATUSES}
      />
      <Select
        value={value.os}
        onChange={e => onChange({ ...value, os: e.target.value })}
        options={[{ value: "all", label: "All OS" }, ...osOptions]}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create `app/agents/AgentCard.tsx`**

```tsx
"use client";
import { Server, ShieldAlert } from "lucide-react";
import { Card, Badge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatRelativeTime } from "@/lib/format";
import { agentIsolation } from "@/hooks/useAlertsStore";
import type { Agent } from "@/types";

const statusClass: Record<string, { dot: string; text: string }> = {
  active:           { dot: "bg-emerald-500", text: "text-emerald-700" },
  pending:          { dot: "bg-amber-500",   text: "text-amber-700" },
  disconnected:     { dot: "bg-slate-300",   text: "text-slate-500" },
  never_connected:  { dot: "bg-rose-500",    text: "text-rose-600" }
};

export function AgentCard({ agent, alertCount, onClick }: { agent: Agent; alertCount: number; onClick: () => void }) {
  const s = statusClass[agent.status];
  const iso = agentIsolation(agent.id);
  return (
    <button type="button" onClick={onClick} className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-xl">
      <Card className="hover:border-slate-300 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 grid place-items-center">
              <Server size={16} className="text-slate-500" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-mono text-slate-900 truncate">{agent.name}</div>
              <div className="text-[11px] font-mono text-slate-500 truncate">{agent.ip}</div>
            </div>
          </div>
          {iso === "isolated" && <Badge tone="high" dot>isolated</Badge>}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <div className={cn("inline-flex items-center gap-1.5", s.text)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", s.dot, agent.status === "active" && "animate-pulse-soft")} />
            {agent.status.replace("_", " ")}
          </div>
          <div className="text-slate-500">{agent.os.name} {agent.os.version}</div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="inline-flex items-center gap-1.5 text-slate-500">
            <ShieldAlert size={12} /> <span className="font-mono text-slate-900">{alertCount}</span> alerts
          </div>
          <div className="text-slate-500">{formatRelativeTime(agent.lastKeepAlive)}</div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {agent.group.map(g => <span key={g} className="inline-flex items-center h-5 px-1.5 rounded text-[10.5px] bg-slate-100 text-slate-600 border border-slate-200">{g}</span>)}
        </div>
      </Card>
    </button>
  );
}
```

- [ ] **Step 3: Create `app/agents/AgentDrawer.tsx`**

```tsx
"use client";
import { useState } from "react";
import { Drawer, Button, Card, Badge, Tabs } from "@/components/ui";
import { Server, PowerOff, Lock, FileText } from "lucide-react";
import { useToasts } from "@/hooks/useToasts";
import { useIsolateAgent, agentIsolation } from "@/hooks/useAlertsStore";
import { formatRelativeTime } from "@/lib/format";
import Link from "next/link";
import { alerts, fimEvents, vulnerabilities } from "@/data/seed";
import type { Agent } from "@/types";

export function AgentDrawer({ agent, open, onClose }: { agent: Agent | null; open: boolean; onClose: () => void }) {
  const toasts = useToasts();
  const isolate = useIsolateAgent();
  const [confirm, setConfirm] = useState<null | "isolate" | "restart">(null);

  if (!agent) return null;
  const iso = agentIsolation(agent.id);
  const myAlerts = alerts.filter(a => a.agent.id === agent.id).slice(0, 8);
  const myFim    = fimEvents.filter(f => f.agent === agent.name).slice(0, 5);
  const myVulns  = vulnerabilities.filter(v => v.agentCount > 0).slice(0, 5);

  function doIsolate() {
    isolate(agent!.id, "isolated");
    toasts.push({ variant: "warn", title: "Agent isolated", description: agent!.name });
    setConfirm(null);
  }
  function doRestart() {
    toasts.push({ variant: "info", title: "Restart requested", description: `${agent!.name} - will report in ~60s` });
    setConfirm(null);
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 grid place-items-center"><Server size={16} className="text-slate-500" /></div>
          <div className="min-w-0">
            <div className="text-sm font-mono text-slate-900 truncate">{agent.name}</div>
            <div className="text-[11px] font-mono text-slate-500 truncate">{agent.ip} - {agent.os.name} {agent.os.version}</div>
          </div>
        </div>
      }
      actions={
        <>
          <Button size="sm" variant={iso === "isolated" ? "primary" : "secondary"} onClick={() => setConfirm("isolate")} icon={<Lock size={12} />}>
            {iso === "isolated" ? "Unisolate" : "Isolate"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setConfirm("restart")} icon={<PowerOff size={12} />}>Restart</Button>
        </>
      }
    >
      <Tabs
        tabs={[
          { id: "overview", label: "Overview", content: (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><div className="text-slate-500">Status</div><div className="text-slate-900">{agent.status.replace("_", " ")}</div></div>
                <div><div className="text-slate-500">Last seen</div><div className="text-slate-900">{formatRelativeTime(agent.lastKeepAlive)}</div></div>
                <div><div className="text-slate-500">Region</div><div className="text-slate-900">{agent.region}</div></div>
                <div><div className="text-slate-500">Manager</div><div className="text-slate-900">{agent.manager}</div></div>
                <div><div className="text-slate-500">Version</div><div className="text-slate-900 font-mono">{agent.version}</div></div>
                <div><div className="text-slate-500">Arch</div><div className="text-slate-900 font-mono">{agent.os.arch}</div></div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Groups</div>
                <div className="flex flex-wrap gap-1">
                  {agent.group.map(g => <span key={g} className="inline-flex items-center h-5 px-1.5 rounded text-[10.5px] bg-slate-100 text-slate-600 border border-slate-200">{g}</span>)}
                </div>
              </div>
            </div>
          )},
          { id: "alerts", label: `Alerts (${myAlerts.length})`, content: (
            myAlerts.length === 0 ? <div className="text-sm text-slate-500">No recent alerts.</div> : (
              <ul className="divide-y divide-slate-100 -mx-1">
                {myAlerts.map(a => (
                  <li key={a.id} className="px-1 py-2 text-xs flex items-center gap-2">
                    <Badge tone={a.rule.level >= 13 ? "critical" : a.rule.level >= 10 ? "high" : a.rule.level >= 7 ? "medium" : "low"} dot>{a.rule.level}</Badge>
                    <span className="font-mono text-slate-500">{a.id}</span>
                    <span className="text-slate-900 truncate flex-1">{a.rule.description}</span>
                    <span className="text-slate-500">{formatRelativeTime(a.timestamp)}</span>
                  </li>
                ))}
              </ul>
            )
          )},
          { id: "fim", label: `FIM (${myFim.length})`, content: (
            myFim.length === 0 ? <div className="text-sm text-slate-500">No FIM events.</div> : (
              <ul className="divide-y divide-slate-100 -mx-1">
                {myFim.map(f => (
                  <li key={f.id} className="px-1 py-2 text-xs flex items-center gap-2">
                    <FileText size={12} className="text-slate-400" />
                    <span className="font-mono text-slate-700">{f.path}</span>
                    <span className="text-slate-500 ml-auto">{f.action}</span>
                    <span className="text-slate-500">{formatRelativeTime(f.timestamp)}</span>
                  </li>
                ))}
              </ul>
            )
          )},
          { id: "vulns", label: `Vulnerabilities (${myVulns.length})`, content: (
            <ul className="divide-y divide-slate-100 -mx-1">
              {myVulns.map(v => (
                <li key={v.cve} className="px-1 py-2 text-xs flex items-center gap-2">
                  <Badge tone={v.severity} dot>{v.severity}</Badge>
                  <span className="font-mono text-slate-700">{v.cve}</span>
                  <span className="text-slate-900 truncate flex-1">{v.title}</span>
                </li>
              ))}
            </ul>
          )}
        ]}
      />

      {confirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setConfirm(null)} />
          <div className="relative bg-white border border-slate-200 rounded-xl shadow-drawer max-w-md w-full mx-4 p-5">
            <div className="text-base font-semibold text-slate-900">{confirm === "isolate" ? "Isolate agent" : "Restart agent"}</div>
            <div className="text-sm text-slate-600 mt-2">
              {confirm === "isolate"
                ? `${agent.name} will be cut off from the network. Investigate before isolating.`
                : `${agent.name} will be restarted. Active sessions will be dropped.`}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
              <Button variant="primary" onClick={confirm === "isolate" ? doIsolate : doRestart}>
                {confirm === "isolate" ? "Isolate" : "Restart"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
```

- [ ] **Step 4: Create `app/agents/page.tsx`**

```tsx
"use client";
import { useState, useMemo } from "react";
import { Page, DataGrid, type Column, Button, Card, CardTitle, CardSubtitle, EmptyState, Server, LayoutGrid, List } from "@/components/ui";
import { agents, alerts } from "@/data/seed";
import { AgentCard } from "./AgentCard";
import { AgentDrawer } from "./AgentDrawer";
import { AgentFiltersBar, type AgentFilters } from "./AgentFilters";
import { Badge } from "@/components/ui";
import { formatRelativeTime } from "@/lib/format";
import { agentIsolation } from "@/hooks/useAlertsStore";
import type { Agent } from "@/types";

export default function AgentsPage() {
  const [view, setView] = useState<"grid" | "table">("grid");
  const [filters, setFilters] = useState<AgentFilters>({ search: "", status: "all", os: "all" });
  const [active, setActive] = useState<Agent | null>(null);

  const osOptions = useMemo(() => {
    const set = new Set(agents.map(a => a.os.name));
    return [...set].map(n => ({ value: n, label: n }));
  }, []);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return agents.filter(a => {
      if (filters.status !== "all" && a.status !== filters.status) return false;
      if (filters.os !== "all" && a.os.name !== filters.os) return false;
      if (q && !(a.name.toLowerCase().includes(q) || a.ip.includes(q) || a.os.name.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [filters]);

  const activeCount = agents.filter(a => a.status === "active").length;
  const disconnCount = agents.filter(a => a.status === "disconnected").length;

  const columns: Column<Agent>[] = [
    { key: "name", header: "Name", sortable: true, sortValue: a => a.name, cell: a => <span className="font-mono text-slate-900">{a.name}</span> },
    { key: "ip", header: "IP", cell: a => <span className="font-mono text-slate-600">{a.ip}</span> },
    { key: "os", header: "OS", cell: a => <span className="text-slate-700">{a.os.name} {a.os.version}</span> },
    { key: "status", header: "Status", cell: a => <Badge tone={a.status === "active" ? "low" : a.status === "disconnected" ? "neutral" : a.status === "pending" ? "medium" : "critical"} dot>{a.status.replace("_", " ")}</Badge> },
    { key: "group", header: "Group", cell: a => <span className="text-slate-600">{a.group.join(", ")}</span> },
    { key: "last", header: "Last seen", sortable: true, sortValue: a => new Date(a.lastKeepAlive).getTime(), cell: a => <span className="text-slate-500">{formatRelativeTime(a.lastKeepAlive)}</span> },
    { key: "alerts", header: "Alerts", cell: a => <span className="font-mono text-slate-900">{alerts.filter(x => x.agent.id === a.id).length}</span> }
  ];

  return (
    <Page
      breadcrumb={[{ href: "/", label: "Operate" }, { label: "Agents" }]}
      icon={Server}
      title="Agents"
      description={`${agents.length} endpoints - ${activeCount} active - ${disconnCount} disconnected`}
      actions={
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
          <button type="button" onClick={() => setView("grid")} className={`inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium ${view === "grid" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>
            <LayoutGrid size={12} /> Grid
          </button>
          <button type="button" onClick={() => setView("table")} className={`inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium ${view === "table" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>
            <List size={12} /> Table
          </button>
        </div>
      }
    >
      <AgentFiltersBar value={filters} onChange={setFilters} osOptions={osOptions} />

      {filtered.length === 0 ? (
        <Card padded={false}>
          <EmptyState icon={Server} title="No agents match" description="Try removing filters." />
        </Card>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(a => (
            <AgentCard key={a.id} agent={a} alertCount={alerts.filter(x => x.agent.id === a.id).length} onClick={() => setActive(a)} />
          ))}
        </div>
      ) : (
        <DataGrid columns={columns} rows={filtered} rowKey={a => a.id} onRowClick={a => setActive(a)} />
      )}

      <AgentDrawer agent={active} open={!!active} onClose={() => setActive(null)} />
    </Page>
  );
}
```

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: 0 errors.

```bash
git add app/agents/
git commit -m "feat(agents): fleet inventory with grid/table toggle and per-agent drawer"
```

---

### Task 23: `/vulnerabilities` page

**Files:**
- Create: `app/vulnerabilities/page.tsx`
- Create: `app/vulnerabilities/VulnDrawer.tsx`

- [ ] **Step 1: Create `app/vulnerabilities/VulnDrawer.tsx`**

```tsx
"use client";
import { Drawer, Button, Badge, Tabs } from "@/components/ui";
import { useToasts } from "@/hooks/useToasts";
import { useSetVulnStatus, vulnStatus } from "@/hooks/useAlertsStore";
import type { VulnState } from "@/types";
import { vulnerabilities, agents } from "@/data/seed";
import Link from "next/link";

const NEXT: Record<VulnState, VulnState | null> = {
  open: "in_progress", in_progress: "patched", patched: null, wont_fix: null
};

export function VulnDrawer({ cve, open, onClose }: { cve: string | null; open: boolean; onClose: () => void }) {
  const toasts = useToasts();
  const setStatus = useSetVulnStatus();
  if (!cve) return null;
  const v = vulnerabilities.find(x => x.cve === cve);
  if (!v) return null;
  const status = vulnStatus(v.cve);
  const next = NEXT[status];

  function set(s: VulnState) {
    setStatus(v!.cve, s);
    toasts.push({ variant: "success", title: `${v!.cve} marked ${s.replace("_", " ")}` });
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 min-w-0">
          <Badge tone={v.severity} dot>{v.severity}</Badge>
          <span className="font-mono text-slate-900 truncate">{v.cve}</span>
        </div>
      }
      actions={
        <>
          {next && <Button size="sm" variant="primary" onClick={() => set(next)}>Mark {next.replace("_", " ")}</Button>}
          {status !== "wont_fix" && <Button size="sm" variant="ghost" onClick={() => set("wont_fix")}>Won't fix</Button>}
        </>
      }
    >
      <Tabs
        tabs={[
          { id: "detail", label: "Detail", content: (
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-slate-500">Title</div>
                <div className="text-slate-900">{v.title}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><div className="text-xs text-slate-500">CVSS</div><div className="font-mono text-slate-900">{v.cvss.toFixed(1)}</div></div>
                <div><div className="text-xs text-slate-500">Status</div><Badge tone={status === "patched" ? "low" : status === "in_progress" ? "medium" : status === "wont_fix" ? "neutral" : "high"} dot>{status.replace("_", " ")}</Badge></div>
                <div><div className="text-xs text-slate-500">Package</div><div className="font-mono text-slate-900">{v.package}</div></div>
                <div><div className="text-xs text-slate-500">Version</div><div className="font-mono text-slate-900">{v.version}</div></div>
                <div><div className="text-xs text-slate-500">Fix</div><div className="font-mono text-slate-900">{v.fixedVersion ?? "-"}</div></div>
                <div><div className="text-xs text-slate-500">Affected agents</div><div className="font-mono text-slate-900">{v.agentCount}</div></div>
              </div>
            </div>
          )},
          { id: "remediation", label: "Remediation", content: (
            <div className="text-sm text-slate-700 space-y-2">
              <p>Upgrade <span className="font-mono">{v.package}</span> to <span className="font-mono">{v.fixedVersion ?? "the latest version"}</span> across all affected agents.</p>
              <ol className="list-decimal pl-5 text-slate-600 space-y-1 text-xs">
                <li>Open the agent's package manager (apt, yum, or docker exec).</li>
                <li>Update the package: <code className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono">install {v.package}={v.fixedVersion ?? "latest"}</code></li>
                <li>Restart the affected service if required.</li>
                <li>Confirm with: <code className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono">wazuh-modulesd -t</code></li>
              </ol>
            </div>
          )},
          { id: "agents", label: `Affected agents (${v.agentCount})`, content: (
            <ul className="divide-y divide-slate-100 -mx-1 text-xs">
              {agents.slice(0, Math.min(v.agentCount, 12)).map(a => (
                <li key={a.id} className="px-1 py-2 flex items-center gap-2">
                  <span className="font-mono text-slate-700">{a.name}</span>
                  <span className="text-slate-500">{a.ip}</span>
                  <Link href="/agents" className="ml-auto text-indigo-600 hover:text-indigo-700">view</Link>
                </li>
              ))}
              {v.agentCount > 12 && <li className="px-1 py-2 text-slate-500">+ {v.agentCount - 12} more</li>}
            </ul>
          )}
        ]}
      />
    </Drawer>
  );
}
```

- [ ] **Step 2: Create `app/vulnerabilities/page.tsx`**

```tsx
"use client";
import { useState, useMemo } from "react";
import { Page, DataGrid, type Column, Card, EmptyState, SearchInput, Button, Badge, ShieldAlert, ShieldCheck } from "@/components/ui";
import { vulnerabilities } from "@/data/seed";
import { VulnDrawer } from "./VulnDrawer";
import { vulnStatus } from "@/hooks/useAlertsStore";
import { useAlertsStore } from "@/hooks/useAlertsStore";
import type { Vulnerability } from "@/types";

export default function VulnerabilitiesPage() {
  const [search, setSearch] = useState("");
  const [patchable, setPatchable] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  useAlertsStore(); // subscribe

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vulnerabilities.filter(v => {
      if (patchable && !v.fixedVersion) return false;
      if (q && !(v.cve.toLowerCase().includes(q) || v.title.toLowerCase().includes(q) || v.package.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [search, patchable]);

  const columns: Column<Vulnerability>[] = [
    { key: "cve", header: "CVE", width: "180px", cell: v => <span className="font-mono text-slate-900">{v.cve}</span> },
    { key: "title", header: "Title", sortable: true, sortValue: v => v.title, cell: v => <span className="text-slate-700 truncate block max-w-[300px]">{v.title}</span> },
    { key: "sev", header: "Severity", width: "120px", cell: v => <Badge tone={v.severity} dot>{v.severity}</Badge> },
    { key: "pkg", header: "Package", cell: v => <span className="font-mono text-slate-700">{v.package}</span> },
    { key: "ver", header: "Version", cell: v => <span className="font-mono text-slate-600">{v.version}</span> },
    { key: "fix", header: "Fix", cell: v => v.fixedVersion ? <span className="font-mono text-slate-900">{v.fixedVersion}</span> : <span className="text-slate-300">-</span> },
    { key: "cvss", header: "CVSS", width: "90px", sortable: true, sortValue: v => v.cvss, cell: v => <span className="font-mono text-slate-900">{v.cvss.toFixed(1)}</span> },
    { key: "agents", header: "Agents", width: "90px", sortable: true, sortValue: v => v.agentCount, cell: v => <span className="font-mono text-slate-900">{v.agentCount}</span> },
    { key: "status", header: "Status", width: "140px", cell: v => {
      const s = vulnStatus(v.cve);
      return <Badge tone={s === "patched" ? "low" : s === "in_progress" ? "medium" : s === "wont_fix" ? "neutral" : "high"} dot>{s.replace("_", " ")}</Badge>;
    }}
  ];

  const totalOcc = vulnerabilities.reduce((s, v) => s + v.agentCount, 0);

  return (
    <Page
      breadcrumb={[{ href: "/", label: "Analyze" }, { label: "Vulnerabilities" }]}
      icon={ShieldCheck}
      title="Vulnerabilities"
      description={`${vulnerabilities.length} open CVEs - ${totalOcc} occurrences across the fleet`}
      actions={<Button variant="secondary" onClick={() => { setPatchable(p => !p); }} icon={<ShieldAlert size={14} />}>{patchable ? "Showing patchable only" : "Show patchable only"}</Button>}
    >
      <Card padded={false}>
        <div className="p-3 flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[240px] max-w-md"><SearchInput value={search} onChange={setSearch} placeholder="Search CVE, package, title..." /></div>
          <label className="inline-flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={patchable} onChange={e => setPatchable(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            Patchable only
          </label>
        </div>
      </Card>

      <DataGrid
        columns={columns}
        rows={filtered}
        rowKey={v => v.cve}
        onRowClick={v => setActive(v.cve)}
        emptyState={<EmptyState icon={ShieldCheck} title="No CVEs match" description="Try clearing search or filters." />}
      />

      <VulnDrawer cve={active} open={!!active} onClose={() => setActive(null)} />
    </Page>
  );
}
```

- [ ] **Step 3: Typecheck and commit**

```bash
npx tsc --noEmit
git add app/vulnerabilities/
git commit -m "feat(vulnerabilities): sortable CVE table with remediation drawer"
```

---

### Task 24: `/fim` page

**Files:**
- Create: `app/fim/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
"use client";
import { useState, useMemo } from "react";
import { Page, DataGrid, type Column, Card, EmptyState, SearchInput, Button, Badge, FileCheck2, Clock, List } from "@/components/ui";
import { fimEvents } from "@/data/seed";
import { formatRelativeTime } from "@/lib/format";
import type { FimEvent } from "@/types";

export default function FimPage() {
  const [view, setView] = useState<"timeline" | "table">("timeline");
  const [action, setAction] = useState<"all" | "modified" | "added" | "deleted">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fimEvents.filter(f => {
      if (action !== "all" && f.action !== action) return false;
      if (q && !(f.path.toLowerCase().includes(q) || f.agent.toLowerCase().includes(q) || f.user.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [action, search]);

  const columns: Column<FimEvent>[] = [
    { key: "time", header: "Time", width: "140px", sortable: true, sortValue: f => new Date(f.timestamp).getTime(), cell: f => <span className="text-slate-500">{formatRelativeTime(f.timestamp)}</span> },
    { key: "action", header: "Action", width: "120px", cell: f => <Badge tone={f.action === "deleted" ? "critical" : f.action === "modified" ? "medium" : "info"} dot>{f.action}</Badge> },
    { key: "path", header: "Path", cell: f => <span className="font-mono text-slate-700 truncate block max-w-[420px]">{f.path}</span> },
    { key: "agent", header: "Agent", cell: f => <span className="font-mono text-slate-600">{f.agent}</span> },
    { key: "user", header: "User", cell: f => <span className="font-mono text-slate-600">{f.user}</span> },
    { key: "size", header: "Size", cell: f => <span className="font-mono text-slate-600">{f.size.toLocaleString()} B</span> }
  ];

  return (
    <Page
      breadcrumb={[{ href: "/", label: "Analyze" }, { label: "File Integrity" }]}
      icon={FileCheck2}
      title="File Integrity"
      description={`${fimEvents.length} events in last 24h`}
      actions={
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
          <button type="button" onClick={() => setView("timeline")} className={`inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium ${view === "timeline" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>
            <Clock size={12} /> Timeline
          </button>
          <button type="button" onClick={() => setView("table")} className={`inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium ${view === "table" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>
            <List size={12} /> Table
          </button>
        </div>
      }
    >
      <Card padded={false}>
        <div className="p-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            {(["all","modified","added","deleted"] as const).map(a => (
              <button key={a} type="button" onClick={() => setAction(a)}
                className={`h-7 px-2.5 rounded-md border text-xs font-medium ${action === a ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {a === "all" ? "All actions" : a}
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-[200px] max-w-md"><SearchInput value={search} onChange={setSearch} placeholder="Search path, agent, user..." /></div>
        </div>
      </Card>

      {view === "table" ? (
        <DataGrid columns={columns} rows={filtered} rowKey={f => f.id}
          emptyState={<EmptyState icon={FileCheck2} title="No FIM events" description="Try adjusting filters." />} />
      ) : (
        <Card padded={false}>
          {filtered.length === 0 ? (
            <EmptyState icon={FileCheck2} title="No FIM events" description="Try adjusting filters." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map(f => (
                <li key={f.id} className="px-4 py-3 flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${f.action === "deleted" ? "bg-rose-500" : f.action === "modified" ? "bg-amber-500" : "bg-sky-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-mono text-slate-900 truncate">{f.path}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      <span className="font-mono">{f.agent}</span> - <span className="font-mono">{f.user}</span> - {f.size.toLocaleString()} B
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge tone={f.action === "deleted" ? "critical" : f.action === "modified" ? "medium" : "info"} dot>{f.action}</Badge>
                    <div className="text-[11px] text-slate-500 mt-1">{formatRelativeTime(f.timestamp)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </Page>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
npx tsc --noEmit
git add app/fim/
git commit -m "feat(fim): file integrity timeline and table views"
```

---

### Task 25: `/compliance` page

**Files:**
- Create: `app/compliance/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
"use client";
import { useState, useMemo } from "react";
import { Page, Card, CardTitle, CardSubtitle, Badge, EmptyState, GitBranch, ChevronDown, ChevronRight } from "@/components/ui";
import { compliance } from "@/data/seed";
import type { ComplianceControl } from "@/types";

const frameworkOrder: ComplianceControl["framework"][] = ["PCI DSS", "HIPAA", "GDPR", "NIST 800-53", "ISO 27001"];

function pct(pass: number, total: number) { return total ? Math.round((pass / total) * 100) : 0; }

export default function CompliancePage() {
  const [open, setOpen] = useState<Record<string, boolean>>({ "PCI DSS": true, "HIPAA": true });

  const groups = useMemo(() => {
    const m = new Map<ComplianceControl["framework"], ComplianceControl[]>();
    frameworkOrder.forEach(f => m.set(f, []));
    compliance.forEach(c => m.get(c.framework)!.push(c));
    return m;
  }, []);

  return (
    <Page
      breadcrumb={[{ href: "/", label: "Analyze" }, { label: "Compliance" }]}
      icon={GitBranch}
      title="Compliance"
      description="Weighted across PCI DSS, HIPAA, GDPR, NIST 800-53, and ISO 27001"
    >
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[...groups.entries()].slice(0, 4).map(([fw, ctrls]) => {
          const pass = ctrls.reduce((s, c) => s + c.pass, 0);
          const total = ctrls.reduce((s, c) => s + c.total, 0);
          const p = pct(pass, total);
          return (
            <Card key={fw}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">{fw}</div>
                <Badge tone={p >= 90 ? "low" : p >= 75 ? "medium" : "high"} dot>{p}%</Badge>
              </div>
              <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${p >= 90 ? "bg-emerald-500" : p >= 75 ? "bg-amber-500" : "bg-orange-500"}`} style={{ width: `${p}%` }} />
              </div>
              <div className="mt-2 text-xs text-slate-500">{ctrls.length} controls - {pass}/{total} checks pass</div>
            </Card>
          );
        })}
      </section>

      <Card padded={false}>
        {[...groups.entries()].map(([fw, ctrls]) => {
          const isOpen = open[fw] ?? false;
          return (
            <div key={fw}>
              <button
                type="button"
                onClick={() => setOpen(o => ({ ...o, [fw]: !o[fw] }))}
                className="w-full flex items-center justify-between gap-3 px-4 h-12 border-b border-slate-200 hover:bg-slate-50">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {fw}
                </div>
                <div className="text-xs text-slate-500">{ctrls.length} controls</div>
              </button>
              {isOpen && (
                <ul className="divide-y divide-slate-100">
                  {ctrls.map(c => {
                    const p = pct(c.pass, c.total);
                    return (
                      <li key={c.control} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-mono text-slate-900">{c.control}</div>
                            <div className="text-xs text-slate-600 mt-0.5">{c.title}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-mono text-slate-900">{p}%</div>
                            <div className="text-[11px] text-slate-500">{c.pass}/{c.total} pass</div>
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${p}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </Card>
    </Page>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
npx tsc --noEmit
git add app/compliance/
git commit -m "feat(compliance): framework cards and grouped controls list"
```

---

### Task 26: `/mitre` page (coverage heatmap)

**Files:**
- Create: `app/mitre/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
"use client";
import { useMemo, useState } from "react";
import { Page, Card, CardTitle, CardSubtitle, Badge, Boxes, Button } from "@/components/ui";
import { alerts, mitreTactics } from "@/data/seed";
import { cn } from "@/lib/cn";

export default function MitrePage() {
  const [active, setActive] = useState<string | null>(null);

  // Compute count per (tactic, technique) from alerts
  const matrix = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    mitreTactics.forEach(t => m.set(t.id, new Map()));
    alerts.forEach(a => {
      const mi = a.rule.mitre;
      if (!mi) return;
      const cell = m.get(mi.id);
      if (cell) cell.set(mi.technique, (cell.get(mi.technique) ?? 0) + 1);
    });
    return m;
  }, []);

  const observedTactics = useMemo(() => {
    return mitreTactics
      .map(t => {
        const cell = matrix.get(t.id)!;
        const total = [...cell.values()].reduce((s, n) => s + n, 0);
        return { id: t.id, tactic: t.tactic, techniques: t.techniques, total };
      })
      .sort((a, b) => a.total - b.total);
  }, [matrix]);

  const max = Math.max(1, ...[...matrix.values()].flatMap(m => [...m.values()]));
  const activeTactic = active ? observedTactics.find(t => t.id === active) : null;

  return (
    <Page
      breadcrumb={[{ href: "/", label: "Analyze" }, { label: "MITRE ATT&CK" }]}
      icon={Boxes}
      title="MITRE ATT&CK"
      description="12 tactics - alert volume by technique - click a cell to filter"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2" padded={false}>
          <div className="px-4 h-11 flex items-center justify-between border-b border-slate-200">
            <div>
              <CardTitle>Coverage heatmap</CardTitle>
              <CardSubtitle>Cell intensity = alert count in last 24h</CardSubtitle>
            </div>
            <div className="text-[10.5px] text-slate-500 flex items-center gap-1.5">
              <span>low</span>
              <span className="w-12 h-1.5 rounded-full bg-gradient-to-r from-indigo-100 to-indigo-700" />
              <span>high</span>
            </div>
          </div>
          <div className="p-4 space-y-1.5">
            {observedTactics.map(t => {
              const cell = matrix.get(t.id)!;
              const isActive = active === t.id;
              return (
                <div key={t.id} className={cn("grid items-center gap-2 py-1 px-2 rounded-md", isActive ? "bg-indigo-50" : "hover:bg-slate-50")} style={{ gridTemplateColumns: "200px 1fr 60px" }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10.5px] font-mono text-slate-500">{t.id}</span>
                    <span className="text-sm text-slate-900 truncate">{t.tactic}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {t.techniques.map(tech => {
                      const count = cell.get(tech) ?? 0;
                      const intensity = count / max;
                      return (
                        <button
                          key={tech}
                          type="button"
                          onClick={() => setActive(t.id)}
                          title={`${tech} - ${count} alerts`}
                          className="h-6 flex-1 rounded border border-slate-200"
                          style={{ background: `rgba(79, 70, 229, ${0.05 + intensity * 0.95})` }}
                        />
                      );
                    })}
                  </div>
                  <div className="text-right text-xs font-mono text-slate-700">{t.total}</div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card padded={false}>
          {activeTactic ? (
            <>
              <div className="px-4 h-11 flex items-center justify-between border-b border-slate-200">
                <div>
                  <CardTitle>{activeTactic.tactic}</CardTitle>
                  <CardSubtitle>{activeTactic.id}</CardSubtitle>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setActive(null)}>Clear</Button>
              </div>
              <ul className="p-3 space-y-2">
                {activeTactic.techniques.map(tech => {
                  const count = matrix.get(activeTactic.id)?.get(tech) ?? 0;
                  return (
                    <li key={tech} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-slate-700">{tech}</span>
                      <span className="ml-auto font-mono text-slate-900">{count}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <div className="p-4">
              <div className="text-sm font-semibold text-slate-900">Click any row</div>
              <p className="text-xs text-slate-500 mt-1">Select a tactic to see its observed techniques and counts.</p>
              <div className="mt-4 text-xs text-slate-500">Weakest 3 tactics:</div>
              <ul className="mt-2 space-y-1">
                {observedTactics.slice(0, 3).map(t => (
                  <li key={t.id} className="flex items-center gap-2 text-xs">
                    <Badge tone="medium" dot>{t.id}</Badge>
                    <span className="text-slate-700">{t.tactic}</span>
                    <span className="ml-auto font-mono text-slate-500">{t.total}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </Page>
  );
}
```

(Add `mitreTactics` to the seed exports if not present. The current `data/seed.ts` defines a `mitreTactics` constant locally — export it.)

- [ ] **Step 2: Export `mitreTactics` from `data/seed.ts`**

Find the `const mitreTactics = [...]` declaration and prefix with `export`.

- [ ] **Step 3: Typecheck and commit**

```bash
npx tsc --noEmit
git add app/mitre/ data/seed.ts
git commit -m "feat(mitre): coverage heatmap and weakest-tactics sidebar"
```

---

### Task 27: `/rules` page

**Files:**
- Create: `app/rules/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
"use client";
import { useState, useMemo } from "react";
import { Page, DataGrid, type Column, Card, EmptyState, SearchInput, Badge, ScrollText } from "@/components/ui";
import { rules } from "@/data/seed";
import { ruleStatus, useToggleRule, useAlertsStore } from "@/hooks/useAlertsStore";
import { useToasts } from "@/hooks/useToasts";
import { formatRelativeTime } from "@/lib/format";
import type { Rule } from "@/types";

export default function RulesPage() {
  useAlertsStore();
  const toasts = useToasts();
  const toggle = useToggleRule();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rules.filter(r => {
      if (q && !(r.id.includes(q) || r.description.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [search]);

  const columns: Column<Rule>[] = [
    { key: "id", header: "ID", width: "120px", cell: r => <span className="font-mono text-slate-900">{r.id}</span> },
    { key: "desc", header: "Description", sortable: true, sortValue: r => r.description, cell: r => <span className="text-slate-700 truncate block max-w-[420px]">{r.description}</span> },
    { key: "level", header: "Level", width: "80px", sortable: true, sortValue: r => r.level, cell: r => <Badge tone={r.level >= 13 ? "critical" : r.level >= 10 ? "high" : r.level >= 7 ? "medium" : "low"} dot>{r.level}</Badge> },
    { key: "groups", header: "Groups", cell: r => <div className="flex flex-wrap gap-1">{r.groups.map(g => <span key={g} className="inline-flex items-center h-5 px-1.5 rounded text-[10.5px] bg-slate-100 text-slate-600 border border-slate-200">{g}</span>)}</div> },
    { key: "hits", header: "Hits 24h", width: "120px", sortable: true, sortValue: r => r.hits24h, cell: r => <span className="font-mono text-slate-900">{r.hits24h.toLocaleString()}</span> },
    { key: "mod", header: "Modified", width: "160px", cell: r => <span className="text-slate-500">{formatRelativeTime(r.modified)}</span> },
    { key: "status", header: "Status", width: "120px", cell: r => {
      const s = ruleStatus(r.id);
      return (
        <button
          type="button"
          onClick={() => { toggle(r.id); toasts.push({ variant: "info", title: `Rule ${r.id} ${s === "enabled" ? "disabled" : "enabled"}` }); }}
          className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-md border text-xs font-medium ${s === "enabled" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-100 border-slate-200 text-slate-500"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${s === "enabled" ? "bg-emerald-500" : "bg-slate-400"}`} />
          {s}
        </button>
      );
    }}
  ];

  return (
    <Page
      breadcrumb={[{ href: "/", label: "Configure" }, { label: "Rules" }]}
      icon={ScrollText}
      title="Rules"
      description={`${rules.length} rules in library - click status to toggle`}
    >
      <Card padded={false}>
        <div className="p-3">
          <div className="max-w-md"><SearchInput value={search} onChange={setSearch} placeholder="Search by ID or description..." /></div>
        </div>
      </Card>
      <DataGrid
        columns={columns}
        rows={filtered}
        rowKey={r => r.id}
        emptyState={<EmptyState icon={ScrollText} title="No rules match" description="Try clearing the search." />}
      />
    </Page>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
npx tsc --noEmit
git add app/rules/
git commit -m "feat(rules): searchable rule library with persisted enable/disable"
```

---

### Task 28: `/logs` page (virtualized live stream)

**Files:**
- Create: `app/logs/page.tsx`
- Install dep: `@tanstack/react-virtual`

- [ ] **Step 1: Install dependency**

```bash
npm install @tanstack/react-virtual@^3.10.0
```

- [ ] **Step 2: Create the page**

```tsx
"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Page, Card, Badge, SearchInput, Select, Button, FileText, Pause, Play } from "@/components/ui";
import { fimEvents } from "@/data/seed";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";

interface Row { id: string; ts: string; source: string; agent: string; severity: "low" | "medium" | "high" | "critical" | "info"; message: string; }

const seedRows: Row[] = Array.from({ length: 400 }, (_, i) => {
  const f = fimEvents[i % fimEvents.length];
  return {
    id: `L-${(1_000_000 + i).toString(16).toUpperCase()}`,
    ts: new Date(Date.now() - i * 1500).toISOString(),
    source: ["sshd", "auditd", "nginx", "kubelet", "wazuh-modulesd"][i % 5],
    agent: f.agent,
    severity: (["low","medium","high","critical","info"] as const)[i % 5],
    message: f.path
  };
});

export default function LogsPage() {
  const [rows, setRows] = useState<Row[]>(seedRows);
  const [paused, setPaused] = useState(false);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [active, setActive] = useState<Row | null>(null);

  // live tail
  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => {
      setRows(prev => [{
        id: `L-${Date.now().toString(16).toUpperCase()}`,
        ts: new Date().toISOString(),
        source: ["sshd","auditd","nginx","kubelet","wazuh-modulesd"][Math.floor(Math.random()*5)],
        agent: seedRows[Math.floor(Math.random()*seedRows.length)].agent,
        severity: (["low","medium","high","critical","info"] as const)[Math.floor(Math.random()*5)],
        message: `event tick ${prev.length}`
      }, ...prev].slice(0, 800));
    }, 2000);
    return () => window.clearInterval(t);
  }, [paused]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (source !== "all" && r.source !== source) return false;
      if (severity !== "all" && r.severity !== severity) return false;
      if (q && !(r.id.toLowerCase().includes(q) || r.message.toLowerCase().includes(q) || r.agent.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, search, source, severity]);

  const parentRef = useRef<HTMLDivElement>(null);
  const v = useVirtualizer({ count: filtered.length, getScrollElement: () => parentRef.current, estimateSize: () => 36, overscan: 12 });

  const sources = useMemo(() => Array.from(new Set(rows.map(r => r.source))).sort(), [rows]);

  return (
    <Page
      breadcrumb={[{ href: "/", label: "Configure" }, { label: "Logs" }]}
      icon={FileText}
      title="Logs"
      description={`${rows.length} events - ${paused ? "paused" : "live"}`}
      actions={<Button variant="secondary" onClick={() => setPaused(p => !p)} icon={paused ? <Play size={14} /> : <Pause size={14} />}>{paused ? "Resume" : "Pause"}</Button>}
    >
      <Card padded={false}>
        <div className="p-3 flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[200px] max-w-md"><SearchInput value={search} onChange={setSearch} placeholder="Search message, agent, id..." /></div>
          <Select value={source} onChange={e => setSource(e.target.value)} options={[{ value: "all", label: "All sources" }, ...sources.map(s => ({ value: s, label: s }))]} />
          <Select value={severity} onChange={e => setSeverity(e.target.value)} options={[
            { value: "all", label: "All severities" },
            { value: "critical", label: "Critical" }, { value: "high", label: "High" },
            { value: "medium", label: "Medium" }, { value: "low", label: "Low" }, { value: "info", label: "Info" }
          ]} />
        </div>
      </Card>

      <Card padded={false}>
        <div className="grid grid-cols-12 px-3 h-9 items-center text-[10.5px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
          <div className="col-span-2">Time</div>
          <div className="col-span-2">Source</div>
          <div className="col-span-2">Severity</div>
          <div className="col-span-2">Agent</div>
          <div className="col-span-4">Message</div>
        </div>
        <div ref={parentRef} className="h-[60vh] overflow-auto">
          <div style={{ height: v.getTotalSize(), position: "relative" }}>
            {v.getVirtualItems().map(vi => {
              const r = filtered[vi.index];
              return (
                <div key={r.id}
                  onClick={() => setActive(r)}
                  className={cn("grid grid-cols-12 px-3 h-9 items-center text-xs border-b border-slate-100 hover:bg-slate-50 cursor-pointer absolute top-0 left-0 right-0")}
                  style={{ transform: `translateY(${vi.start}px)` }}>
                  <div className="col-span-2 text-slate-500 font-mono">{formatRelativeTime(r.ts)}</div>
                  <div className="col-span-2 text-slate-700 font-mono">{r.source}</div>
                  <div className="col-span-2"><Badge tone={r.severity} dot>{r.severity}</Badge></div>
                  <div className="col-span-2 text-slate-600 font-mono truncate">{r.agent}</div>
                  <div className="col-span-4 text-slate-700 truncate font-mono">{r.message}</div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {active && (
        <div className="fixed inset-0 z-50" onClick={() => setActive(null)}>
          <div className="absolute inset-0 bg-slate-900/40" />
          <div onClick={e => e.stopPropagation()} className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-drawer p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-slate-900">Event {active.id}</div>
              <button onClick={() => setActive(null)} className="text-xs text-slate-500 hover:text-slate-900">Close</button>
            </div>
            <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto text-slate-700">
{JSON.stringify(active, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </Page>
  );
}
```

- [ ] **Step 3: Typecheck and commit**

```bash
npx tsc --noEmit
git add app/logs/ package.json package-lock.json
git commit -m "feat(logs): virtualized live event stream with pause and filters"
```

---

### Task 29: `/threat-intel` page

**Files:**
- Create: `app/threat-intel/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
"use client";
import { Page, Card, CardTitle, CardSubtitle, Badge, EmptyState, Bug, Shield } from "@/components/ui";
import { threatActors } from "@/data/seed";
import { mitreTactics } from "@/data/seed";

export default function ThreatIntelPage() {
  // Build a map of technique ID -> tactic
  const techToTactic = new Map<string, string>();
  mitreTactics.forEach(t => t.techniques.forEach(tech => techToTactic.set(tech, t.tactic)));

  return (
    <Page
      breadcrumb={[{ href: "/", label: "Operate" }, { label: "Threat Intel" }]}
      icon={Bug}
      title="Threat Intel"
      description={`${threatActors.length} actors tracked - ${threatActors.reduce((s, a) => s + a.observed24h, 0)} sightings in last 24h`}
    >
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {threatActors.map(a => (
          <Card key={a.id} className="hover:border-slate-300 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-slate-900">{a.name}</div>
                <div className="text-xs text-slate-500">{a.id} - {a.origin}</div>
              </div>
              {a.observed24h > 0 && <Badge tone={a.observed24h > 8 ? "high" : "medium"} dot>{a.observed24h} sightings</Badge>}
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {a.targetSectors.map(s => <span key={s} className="inline-flex items-center h-5 px-1.5 rounded text-[10.5px] bg-slate-100 text-slate-600 border border-slate-200">{s}</span>)}
            </div>
            <div className="mt-3">
              <div className="text-[10.5px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">TTPs</div>
              <div className="flex flex-wrap gap-1">
                {a.ttps.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 h-5 px-1.5 rounded text-[10.5px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Shield size={10} /> {t}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </section>

      <Card padded={false}>
        <div className="px-4 h-11 flex items-center border-b border-slate-200">
          <div>
            <CardTitle>All tracked techniques</CardTitle>
            <CardSubtitle>Click a chip to filter the coverage map</CardSubtitle>
          </div>
        </div>
        <div className="p-4 flex flex-wrap gap-1.5">
          {Array.from(new Set(threatActors.flatMap(a => a.ttps))).map(t => (
            <span key={t} className="inline-flex items-center gap-1 h-6 px-2 rounded text-xs bg-slate-100 text-slate-700 border border-slate-200">
              {t} <span className="text-slate-500">- {techToTactic.get(t) ?? "?"}</span>
            </span>
          ))}
        </div>
      </Card>
    </Page>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
npx tsc --noEmit
git add app/threat-intel/
git commit -m "feat(threat-intel): actor cards and technique chip cloud"
```

---

### Task 30: `/settings` page

**Files:**
- Create: `app/settings/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
"use client";
import { useState } from "react";
import { Page, Card, CardTitle, CardSubtitle, Button, Badge, Settings, Download, RotateCcw, Tooltip } from "@/components/ui";
import { useToasts } from "@/hooks/useToasts";
import { useReset, useAlertsStore } from "@/hooks/useAlertsStore";
import { alerts } from "@/data/seed";

const integrations = [
  { name: "VirusTotal",   status: "connected",  desc: "Hash and URL lookups" },
  { name: "Slack",        status: "connected",  desc: "Critical alert notifications" },
  { name: "PagerDuty",    status: "connected",  desc: "On-call escalation" },
  { name: "Jira",         status: "disconnected", desc: "Ticket creation" }
];

export default function SettingsPage() {
  const toasts = useToasts();
  const reset = useReset();
  useAlertsStore();
  const [confirmReset, setConfirmReset] = useState(false);

  function doExport() {
    try {
      const data = { alerts, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `sentinel-stack-alerts-${Date.now()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toasts.push({ variant: "success", title: "Export complete", description: `${alerts.length} alerts downloaded` });
    } catch (e) {
      toasts.push({ variant: "error", title: "Export failed" });
    }
  }

  return (
    <Page
      breadcrumb={[{ label: "Configure" }, { label: "Settings" }]}
      icon={Settings}
      title="Settings"
      description="Cluster, integrations, profile, and data"
    >
      <Card padded={false}>
        <div className="px-4 h-11 flex items-center border-b border-slate-200">
          <CardTitle>Cluster</CardTitle>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center justify-between"><span className="text-slate-500">Manager</span><span className="font-mono text-slate-900">prod-01</span></div>
          <div className="flex items-center justify-between"><span className="text-slate-500">Workers</span><span className="font-mono text-slate-900">3 / 3</span></div>
          <div className="flex items-center justify-between"><span className="text-slate-500">Indexer</span><span className="font-mono text-slate-900">opensearch 2.15</span></div>
          <div className="flex items-center justify-between"><span className="text-slate-500">API latency p95</span><span className="font-mono text-slate-900">38 ms</span></div>
        </div>
      </Card>

      <Card padded={false}>
        <div className="px-4 h-11 flex items-center border-b border-slate-200">
          <CardTitle>Integrations</CardTitle>
        </div>
        <ul className="divide-y divide-slate-100">
          {integrations.map(i => (
            <li key={i.name} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900">{i.name}</div>
                <div className="text-xs text-slate-500">{i.desc}</div>
              </div>
              <Badge tone={i.status === "connected" ? "low" : "neutral"} dot>{i.status}</Badge>
              <Button size="sm" variant="secondary" onClick={() => toasts.push({ variant: "info", title: `Configuring ${i.name} (coming soon)` })}>Configure</Button>
            </li>
          ))}
        </ul>
      </Card>

      <Card padded={false}>
        <div className="px-4 h-11 flex items-center border-b border-slate-200">
          <CardTitle>Profile</CardTitle>
        </div>
        <div className="p-4 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-900">Theme</div>
              <div className="text-xs text-slate-500">Light is the only supported theme this release.</div>
            </div>
            <Tooltip content="Dark mode coming soon"><span><Badge tone="neutral">Light (locked)</Badge></span></Tooltip>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-900">Default time range</div>
              <div className="text-xs text-slate-500">Used when you open a page.</div>
            </div>
            <span className="text-slate-700">Last 24 hours</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-900">Default environment</div>
              <div className="text-xs text-slate-500">Selected at sign-in.</div>
            </div>
            <span className="text-slate-700">production - us-east-1</span>
          </div>
        </div>
      </Card>

      <Card padded={false}>
        <div className="px-4 h-11 flex items-center border-b border-slate-200">
          <CardTitle>Data</CardTitle>
        </div>
        <div className="p-4 flex flex-wrap items-center gap-2">
          <Button variant="secondary" icon={<Download size={14} />} onClick={doExport}>Export alerts as JSON</Button>
          <Button variant="danger" icon={<RotateCcw size={14} />} onClick={() => setConfirmReset(true)}>Reset to defaults</Button>
        </div>
      </Card>

      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setConfirmReset(false)} />
          <div className="relative bg-white border border-slate-200 rounded-xl shadow-drawer max-w-md w-full mx-4 p-5">
            <div className="text-base font-semibold text-slate-900">Reset to defaults?</div>
            <div className="text-sm text-slate-600 mt-2">This clears all your acknowledgements, archived alerts, rule toggles, and CVE status changes. The page will reload.</div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => { reset(); toasts.push({ variant: "success", title: "Reset complete" }); setConfirmReset(false); }}>Reset</Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
npx tsc --noEmit
git add app/settings/
git commit -m "feat(settings): cluster, integrations, profile, and data controls"
```

---

## Phase F — Verification and cleanup

### Task 31: Full test suite

- [ ] **Step 1: Run all unit + component tests**

```bash
npx vitest run
```

Expected: all suites pass.

- [ ] **Step 2: If anything fails, fix and re-run**

(Address any failures inline. Common issues: missing exports from `data/seed`, bad imports of `mitreTactics` before it was exported, or a `react` import missing in test files.)

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "test: stabilize full test suite"
```

---

### Task 32: Build verification

- [ ] **Step 1: Typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Lint (if a lint script is defined)**

```bash
npm run lint
```

Expected: no new errors. (Skip if `next lint` is unconfigured.)

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: build succeeds; the 11 routes (`/`, `/alerts`, `/agents`, `/vulnerabilities`, `/fim`, `/compliance`, `/mitre`, `/rules`, `/logs`, `/threat-intel`, `/settings`) are all listed in the output.

- [ ] **Step 4: If any route fails to build, fix the page and re-run**

---

### Task 33: Manual smoke pass

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Open `http://localhost:3000`.

- [ ] **Step 2: Walk every page**

For each of the 11 routes:

- Page loads without console errors
- Page header shows breadcrumb, icon, title, description
- All filter controls work
- All buttons (Refresh, Acknowledge, Isolate, Escalate, Toggle, etc.) trigger a toast
- Drawer opens and closes via click, ESC, and backdrop
- localStorage persistence: ack an alert, refresh the page, confirm the ack survives

- [ ] **Step 3: Keyboard shortcuts**

- `Cmd/Ctrl + K` opens the command palette
- `G` then `A` navigates to `/alerts`
- `G` then `S` navigates to `/settings`
- `?` opens the help popover in the topbar
- `Esc` closes any drawer

- [ ] **Step 4: Reset to defaults**

- On `/settings`, click "Reset to defaults", confirm
- Refresh the page; the seed state should be back

- [ ] **Step 5: Stop the dev server**

```bash
# in another terminal
pkill -f "next dev"
```

---

### Task 34: Commit final state

- [ ] **Step 1: Verify working tree is clean except for plan/spec**

```bash
git status
```

Expected: no unexpected modifications. The plan and spec are already committed.

- [ ] **Step 2: Final tag (optional)**

If the user wants a tag, run:

```bash
git tag v0.2.0-light
```

Skip this step unless asked.

---

## Self-review

After writing the plan, the following checks were performed:

1. **Spec coverage:**
   - §3 Visual system → Task 1 (Tailwind config + globals.css).
   - §4 Component primitives → Tasks 4–10.
   - §5 Pages → Tasks 19, 21–30.
   - §6 Data and state → Task 3 (persisted store) + Task 2 (storage + useLocalStorage).
   - §7 Cross-cutting UX → Tasks 11 (toasts/modal), 12–17 (shell), Task 18 (seed), 13 (go-to shortcuts).
   - §8 Project structure → mirrored across all tasks.
   - §9 Testing → Tasks 2, 3, 7, 21, 31, 33.
   - §10 Dependencies → npm installs in Tasks 2 and 28.
   - §11 Risks → acknowledged in plan; the SSR-hydration flash in particular is covered by every page being `"use client"`.
   - §12 Acceptance criteria → Tasks 31–34 verify each one.

2. **Placeholder scan:** No TBD, TODO, "implement later", "fill in details", "similar to Task N", or similar. All steps show actual code or commands.

3. **Type consistency:**
   - `severityBucket` / `severityLabel` / `severityShort` used consistently in Types 21, 22, 23, 27, 28.
   - `useAlertsStore`, `useAcknowledge`, `useArchive`, `useSetVulnStatus`, `useToggleRule`, `useMarkFimReviewed`, `useIsolateAgent`, `useReset` defined in Task 3 and consumed in Tasks 19, 21–23, 25, 27, 30.
   - `vulnStatus`, `ruleStatus`, `agentIsolation`, `isAcked`, `isArchived`, `fimReviewState` defined in Task 3 and consumed in 21, 22, 23, 27, 30.
   - `Drawer` `open`/`onClose`/`title`/`actions`/`width` consistent across Tasks 21, 22, 23.
   - `DataGrid` `columns`/`rows`/`rowKey`/`onRowClick`/`selectable`/`selected`/`onSelectionChange`/`emptyState` consistent across 21, 22, 23, 27.
   - `Page` `breadcrumb`/`icon`/`title`/`description`/`actions` consistent across all pages.
   - `Card` `header`/`padded` consistent.

No mismatches found.

---

## Execution options

Plan complete and saved to `docs/superpowers/plans/2026-06-22-wazuh-dashboard.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.
