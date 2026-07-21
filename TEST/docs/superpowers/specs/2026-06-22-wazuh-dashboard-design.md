# Sentinel Stack — Wazuh Dashboard Design

**Status:** Draft
**Date:** 2026-06-22
**Author:** Claude (brainstorming session)
**Approach:** B — Full visual redesign + localStorage persistence + fill all empty pages

---

## 1. Background and motivation

The repository at `D:\projects\dashboard` is a Next.js 14 App Router Wazuh dashboard named **Sentinel Stack**. A substantial scaffold already exists:

- A complete dark "ops" design system (Tailwind config with `signal` cyan + `ink` graphite palette, custom shadows, animations, `live-dot` pulses).
- `app/layout.tsx` shell with Sidebar, Topbar, CommandPalette, and providers (`ToastProvider`, `TimeRangeProvider`).
- A fully implemented **Overview** page (`app/page.tsx`) with KPI row, alert volume chart, severity donut, live alert stream, noisiest agents, MITRE bar, top countries, cluster health strip, CVE list, and rule activity chart.
- Domain types in `types/index.ts`, deterministic seed data in `data/seed.ts`, formatting helpers in `lib/format.ts`, UI primitives in `components/ui/primitives.tsx`, and several hooks (`useToasts`, `useTheme`, `useTimeRange`, `useAlertsStore`, `useCommandPalette`).

What's missing or wrong for the goal:

1. The visual language is dark and "ops-terminal" — the user wants a **light, modern "enterprise SOC"** feel (white surfaces, slate text, electric-blue accent, generous whitespace).
2. Nine route directories are empty: `app/alerts`, `app/agents`, `app/vulnerabilities`, `app/fim`, `app/compliance`, `app/mitre`, `app/rules`, `app/logs`, `app/threat-intel`, `app/settings`.
3. `useAlertsStore` is in-memory only — user actions (ack, archive, rule toggle, vuln status) are lost on refresh.
4. No `Drawer` primitive, no `Table`/`DataGrid` primitive, no `EmptyState` for tables, no `Skeleton`, no `Tabs`.
5. The current CSS component classes (`.btn`, `.chip`, `.input`, `.panel`, `.surface-1/2/3`) are tied to the dark design system and need a light replacement.

This design replaces the visual system, fills every page, and adds localStorage persistence so the dashboard feels like a real product.

---

## 2. Goals and non-goals

### Goals

- Light, accessible, "enterprise SOC" visual language.
- Every route reachable from the sidebar renders a real, useful page (no stubs).
- User actions (ack, archive, isolate, toggle, status changes) persist across page reloads.
- Every mutating action gives feedback via toast and/or confirm dialog.
- Empty / loading / error states on every list page.
- All interactive elements keyboard-reachable with visible focus rings.
- Reduced-motion respected.

### Non-goals

- Real Wazuh Manager API integration (mocked; the data layer is the swap point).
- Authentication (mock user "R. Aydın").
- Internationalization.
- Mobile breakpoint <640px optimized (works, not tuned).
- Dark mode for this iteration (light-only; can be reintroduced by adding a `:root.dark` block in `globals.css`).
- New charting libraries (recharts stays).

---

## 3. Visual system

### 3.1 Palette

Replace the current `signal` and `ink` Tailwind colors with a slate + indigo system:

| Token | Hex | Use |
|---|---|---|
| `bg-app` | `#F8FAFC` | App background (slate-50) |
| `bg-surface` | `#FFFFFF` | Cards, drawers, popovers |
| `bg-surface-2` | `#F1F5F9` | Subtle row hover, inset (slate-100) |
| `border-soft` | `#E2E8F0` | Default borders (slate-200) |
| `border-emphasis` | `#CBD5E1` | Hover/focus borders (slate-300) |
| `text-primary` | `#0F172A` | Headings, KPI values (slate-900) |
| `text-secondary` | `#475569` | Body, labels (slate-600) |
| `text-muted` | `#94A3B8` | Captions, placeholders (slate-400) |
| `accent` | `#4F46E5` | Primary buttons, links, focus (indigo-600) |
| `accent-hover` | `#4338CA` | Primary hover (indigo-700) |
| `accent-soft` | `#EEF2FF` | Selected rows, indigo-50 tints |
| `info` | `#0EA5E9` | Informational chips (sky-500) |

Severity (semantic) — desaturated for a professional look:

| Token | Hex | Use |
|---|---|---|
| `critical` | `#E11D48` | Level ≥ 13 (rose-600) |
| `high` | `#EA580C` | Level ≥ 10 (orange-600) |
| `medium` | `#D97706` | Level ≥ 7 (amber-600) |
| `low` | `#059669` | Level ≥ 4 (emerald-600) |
| `info` | `#0EA5E9` | Level < 4 (sky-500) |

Each severity ships both a text color and a soft-tinted background pair (e.g. `bg-critical-soft` = `#FFF1F2`, `text-critical` = `#E11D48`).

### 3.2 Typography

- Font: Inter (already loaded via `var(--font-sans)`), JetBrains Mono for IDs/IPs/timestamps.
- Scale (replaces the current 10.5/11/12.5 ladder):

  | Token | Size | Line height | Use |
  |---|---|---|---|
  | `text-xs` | 12px | 16px | Captions, kbd |
  | `text-sm` | 13px | 18px | Table body, inputs |
  | `text-base` | 14px | 20px | Page body |
  | `text-md` | 15px | 22px | Card titles |
  | `text-lg` | 16px | 24px | Section titles |
  | `text-xl` | 20px | 28px | Page titles |
  | `text-2xl` | 24px | 32px | KPI values |
  | `text-3xl` | 30px | 36px | Hero numbers |

- All numeric content uses `font-variant-numeric: tabular-nums` (already in `globals.css`).

### 3.3 Shape, depth, motion

- Border radius: `rounded-xl` (12px) for cards/drawers, `rounded-lg` (8px) for buttons/inputs, `rounded-md` (6px) for chips.
- Shadows:
  - `shadow-card`: `0 1px 2px rgb(15 23 42 / 0.04), 0 1px 3px rgb(15 23 42 / 0.06)`
  - `shadow-pop`: `0 4px 12px rgb(15 23 42 / 0.08), 0 2px 4px rgb(15 23 42 / 0.04)`
  - `shadow-drawer`: `0 24px 48px -12px rgb(15 23 42 / 0.18)`
- Motion: 180ms ease-out for hover, 220ms for drawer/modal slide, 1.6s for live-dot pulse. No `scan-line` animation. Recharts animations disabled (or 200ms).
- `prefers-reduced-motion: reduce` already handled in `globals.css` — extend to disable chart animations.

### 3.4 Iconography

- Lucide stays, sizes 16/18/20 for body, 14 for inline, 22 for empty-state.
- A new `IconBadge` primitive: 36×36 rounded-xl surface with the page icon in `accent` color, used in page headers as a "where am I" cue.

---

## 4. Component primitives

Lives in `components/ui/`, one component per file plus `index.ts` barrel. All pure, typed, a11y-first (button ≠ div, focus rings, `aria-*`).

| Component | Replaces | Notes |
|---|---|---|
| `Button` | `.btn*` classes | Variants `primary` / `secondary` / `ghost` / `danger`; sizes `sm/md/lg`; `icon` prop for icon-only; loading spinner slot |
| `Card` | `.panel*` | `header` / `body` / `footer` slots; `padded` prop; `flush` for no inner padding |
| `Badge` | `.chip` + `SeverityBadge` | `tone` prop: `neutral` / `info` / `low` / `medium` / `high` / `critical`; optional dot |
| `Input` | `.input` | Leading icon slot, error state, helper text |
| `SearchInput` | new | Input with search icon + clear button |
| `Select` | new | Native `<select>` styled to match; used in filter bars |
| `Table` | new | Sticky header, row hover, selectable rows, empty state slot |
| `DataGrid<T>` | new | Table + per-column `sort: "asc" \| "desc" \| null` + filter chips |
| `Drawer` | new | Right-side, ESC + backdrop close, focus trap, `aria-modal` |
| `Tabs` | new | Underline-style, arrow-key navigation, `aria-orientation="horizontal"` |
| `EmptyState` | new | Icon, title, description, optional action |
| `Skeleton` | new | Pulse placeholder (gray-200) |
| `ErrorState` | new | EmptyState with retry button |
| `StatCard` | `Kpi` | Label, value, delta, hint, accent, optional sparkline |
| `IconBadge` | new | 36×36 rounded-xl surface for page header |
| `Tooltip` | new | 200ms hover delay, no portal library (positioned `absolute`) |
| `Page` | new | Wraps page header (breadcrumb + icon badge + title + description + actions) + content slot; the canonical layout every page uses |
| `Toast` / `ConfirmDialog` | existing | Restyled to match light theme |
| `useLocalStorage<T>` | new | SSR-safe hydration in `hooks/useLocalStorage.ts` |

### 4.1 `Page` primitive — the page-header pattern

```tsx
<Page
  breadcrumb={[{ href: "/", label: "Operate" }, { label: "Alerts" }]}
  icon={ShieldAlert}
  title="Alerts"
  description="Every security event from the last 7 days, ranked by severity."
  actions={<Button variant="primary">Export</Button>}
>
  {/* page content */}
</Page>
```

Centralizing this means every page has the same shape and the visual system is enforced by construction.

---

## 5. Pages

### 5.1 `/` Overview — refresh, do not rebuild

Restyled to the new light palette. Same layout, same charts, same data flow. Components switch from `Kpi` → `StatCard`, `Panel` → `Card`. Background becomes `bg-app`. Health-strip dividers switch from `border-soft` to a lighter separator.

Recharts explicit tokens for the Overview charts: axis/grid `stroke` `#E2E8F0`; tick labels `#94A3B8`; tooltip background `#FFFFFF`, border `#E2E8F0`, text `#0F172A`; tooltip cursor `rgba(79, 70, 229, 0.06)`. Area chart uses severity colors; the single-series Bar charts (MITRE, rule activity) use `#4F46E5`. Chart animations disabled when `prefers-reduced-motion: reduce`.

### 5.2 `/alerts` — primary analyst surface

- **Header**: `Page` with `ShieldAlert` icon badge, "Alerts" title, "220 events in last 24h · 8 critical" description, actions: "Acknowledge all visible" (secondary), "Export" (secondary), "Open filter" (primary, focuses first filter).
- **Filter bar** (sticky under topbar): severity chips (multi-select), rule group select, MITRE tactic select, agent select, time range, "Show acked" toggle, free-text search.
- **Bulk action toolbar**: appears when ≥1 row selected — count, "Acknowledge", "Escalate to L2", "Archive", "Clear selection".
- **Table** (sortable, sticky header, selectable):
  - Columns: checkbox, time (relative + absolute on hover), severity badge, rule ID (mono, links to `/rules`), description (truncated, full in drawer), agent (mono, links to `/agents`), MITRE (chip if present), ack status (icon).
  - Default sort: time desc. Click row → Drawer.
- **Drawer** (`max-w-xl`, right-side):
  - Header: rule description, severity, "Acknowledge" / "Escalate" / "Archive" / "Copy ID" buttons.
  - Body tabs: **Event** (raw JSON, syntax-highlighted mock), **Agent** (compact card linking to `/agents`), **MITRE** (technique + tactic + link to `/mitre`), **Related** (other alerts with same rule.id, last 24h).
- **Empty state** when filters return zero: "No alerts match" + "Clear filters" action.
- **Loading state**: 5 skeleton rows for 250ms on mount (and on Refresh).

### 5.3 `/agents` — fleet inventory

- **Header**: `Page` with `Server` icon, "Agents" title, "64 endpoints · 48 active · 6 disconnected" description, view toggle (Grid/Table).
- **Filter bar**: status chips, OS select, group select, region select, search.
- **Grid view** (default): 3-col cards. Each card: name (mono), IP, OS icon, status dot, last keepalive (relative), alert count badge, group chips.
- **Table view**: same data, columns Name / IP / OS / Status / Group / Last seen / Alerts.
- **Drawer** on row click:
  - Header: name, IP, OS, status, "Isolate" / "Restart" / "View logs" buttons.
  - Tabs: **Overview** (groups, region, manager, version, uptime), **Recent alerts** (last 10, links to `/alerts`), **FIM** (last 5 events), **Vulnerabilities** (CVEs affecting this agent), **Actions** (Isolate / Restart with confirm).
- "Isolate" / "Restart" trigger `ConfirmDialog` + success toast + status pill flips to "isolated" in store.

### 5.4 `/vulnerabilities` — CVE table

- **Header**: `Page` with `ShieldAlert` icon, "Vulnerabilities" title, "12 open CVEs · 248 occurrences" description.
- **Filter bar**: severity chips, package search, "Patchable only" toggle.
- **Table** (sortable): CVE (mono), title, severity, package, version, fixed version (or "—"), CVSS, affected agents, status (open/in_progress/patched/wont_fix), published.
- **Drawer**:
  - Header: CVE, CVSS vector (mock), severity, "Mark patched" / "Mark in progress" / "Mark won't fix" actions.
  - Body: description, affected agents list (links to `/agents`), remediation step ("Upgrade `openssh` to `9.8p1`").
- Status changes write to `vulnMap` and persist.

### 5.5 `/fim` — file integrity events

- **Header**: `Page` with `FileCheck2` icon, "File Integrity" title, "60 events in last 24h" description, view toggle (Timeline / Table).
- **Timeline view**: vertical timeline with action icons (modified/added/deleted), grouped by hour.
- **Table view**: time, agent, path, action, user, size.
- **Drawer**: file path, full diff snippet (mock), agent jump, "Mark reviewed" action (persists in `fimMap`).

### 5.6 `/compliance` — framework scoring

- **Header**: `Page` with `GitBranch` icon, "Compliance" title, "97% weighted across frameworks" description.
- **Framework cards** (4 across): PCI DSS, HIPAA, GDPR, NIST 800-53. Each: framework name, overall %, trend arrow, pass/fail mini-bar, link to framework section.
- **Controls table** (grouped by framework, collapsible groups): control ID, title, pass / fail / total with stacked bar, "View detail" link.
- **Drawer** for control: description, failing agents list, evidence (mock JSON), remediation pointer.

### 5.7 `/mitre` — coverage heatmap

- **Header**: `Page` with `Boxes` icon, "MITRE ATT&CK" title, "26 techniques observed · weakest: Persistence" description.
- **Heatmap**: 12 tactic rows × top technique columns. Cells colored by alert volume (light to dark indigo gradient). Hover shows count; click filters the right panel.
- **Right panel**: selected tactic's techniques with observed counts, "Open in /alerts" link (pre-filtered query param).
- **Below**: weakest 3 tactics with a "Boost detection" CTA (toast).

### 5.8 `/rules` — rule library

- **Header**: `Page` with `ScrollText` icon, "Rules" title, "1,284 rules · 36 custom" description.
- **Filter bar**: search, level range, group select, status (enabled/disabled), sort (hits 24h, level, modified).
- **Table**: ID, description, level, groups, status (toggle), hits/24h, last modified.
- Toggle persists to `ruleMap`.
- **Drawer**: rule XML (mock), recent firings (last 10 timestamps), related CVEs, "View firings" → `/alerts?ruleId=…`.

### 5.9 `/logs` — raw event stream

- **Header**: `Page` with `FileText` icon, "Logs" title, "1,284 events/sec" description, "Pause" / "Resume" toggle (default live).
- **Filter bar**: source/decoder select, agent select, severity chips, search.
- **Virtualized table** (`@tanstack/react-virtual`, new dep) — 30 visible rows, scroll loads older. Live mode: prepends a new mock row every 2s.
- **Drawer**: full event JSON.

### 5.10 `/threat-intel` — IOC catalog

- **Header**: `Page` with `Bug` icon, "Threat Intel" title, "12 actors tracked" description.
- **Cards** (3-col): actor name, origin, target sectors, TTPs as chips, "Observed in last 24h" badge.
- **TTPs section** at bottom: full chip cloud with links to `/mitre?technique=…`.

### 5.11 `/settings` — cluster & integrations

- **Header**: `Page` with `Settings` icon, "Settings" title.
- **Sections** (cards stacked):
  - **Cluster** (read-only mock): manager, workers, indexer, API latency.
  - **Integrations**: VirusTotal, Slack, PagerDuty, Jira — each row has name, status, "Configure" button.
  - **Profile**: theme (locked to "light" this iteration, with a "Coming soon" tooltip for dark), default time range, default environment.
  - **Data**: "Export alerts as JSON" (downloads a blob of current alerts), "Reset to defaults" (clears localStorage, re-hydrates from seed, toast confirms).

---

## 6. Data and state

### 6.1 Storage layer

`lib/storage.ts`:

```ts
const NS = "sentinel-stack:v1";
export const storage = {
  get<T>(key: string, fallback: T): T { /* SSR-safe */ },
  set<T>(key: string, value: T): void { /* client-only */ },
  remove(key: string): void { /* client-only */ },
  clear(): void { /* all sentinel-stack keys */ }
};
```

Namespaced keys: `sentinel-stack:v1:alerts`, `…:vulns`, `…:rules`, `…:fim`, `…:profile`, `…:ui` (filter prefs, view toggles).

### 6.2 `useLocalStorage<T>` hook

SSR-safe (returns `fallback` during SSR, re-reads on mount), cross-tab `storage` event sync, JSON-typed.

### 6.3 Store refactor — `useAlertsStore`

Current store keeps state in module scope. Refactor:

- On first client render: read from `storage.get("alerts", seedAlertsState)`. If absent, write seed state.
- All mutators (`useAcknowledge`, `useArchive`, `useSetVulnStatus`, `useToggleRule`, new `useFimReviewed`, `useIsolateAgent`) call `notify()` **and** `storage.set(...)`.
- New `useReset()` action clears all `sentinel-stack:v1:*` keys and re-hydrates from seed.

### 6.4 Simulated refresh

When user clicks Refresh on `/` Overview or `/alerts`:

1. Set `loading = true` for 600–900ms (random within range).
2. Skeletons render.
3. After delay, randomly bump 1–3 KPIs (within ±5% of current value, never below zero) and inject 1–2 new alerts at the top of the alerts list.
4. Toast: "Refreshed · 1,284 events re-queried".

A dev flag `NEXT_PUBLIC_SIMULATE_FETCH_ERROR=1` makes 1-in-20 refreshes show `ErrorState` with a Retry button — for testing the error path.

---

## 7. Cross-cutting UX

- **Toasts** (already implemented): every mutating action gets one. Variants `info` / `success` / `warn` / `error`. Top-right, auto-dismiss 3–4s, dismissible.
- **Confirm dialog** (already implemented): used by Isolate, Restart, Escalate, Reset to defaults.
- **Keyboard**:
  - `⌘K` / `Ctrl K` → command palette (already exists; restyled).
  - `G` then `O` / `A` / `R` / `V` / `F` / `C` / `M` / `L` → go-to (already advertised in Topbar help; **wire them up** in a new `useGoToShortcuts` hook that listens at the document level).
  - `?` → toggle help popover.
  - `A` (when not in an input) → acknowledge selected alerts on `/alerts`.
  - `Esc` → close any overlay.
- **Focus**: every interactive element has a visible 2px indigo focus ring (`focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app`).
- **Skip link**: already in layout — keep.
- **Reduced motion**: extend existing `globals.css` rule to also disable Recharts animations.

---

## 8. Project structure

```
app/
  layout.tsx                    # light theme, updated metadata
  page.tsx                      # Overview (restyled)
  alerts/page.tsx
  agents/page.tsx
  vulnerabilities/page.tsx
  fim/page.tsx
  compliance/page.tsx
  mitre/page.tsx
  rules/page.tsx
  logs/page.tsx
  threat-intel/page.tsx
  settings/page.tsx
components/
  Sidebar.tsx                   # restyled
  Topbar.tsx                    # restyled
  CommandPalette.tsx            # restyled
  Modal.tsx                     # restyled ConfirmDialog
  EmptyState.tsx                # kept + extended
  ui/
    index.ts                    # barrel
    Button.tsx
    Card.tsx
    Badge.tsx
    Input.tsx
    SearchInput.tsx
    Select.tsx
    Table.tsx
    DataGrid.tsx
    Drawer.tsx
    Tabs.tsx
    EmptyState.tsx
    Skeleton.tsx
    ErrorState.tsx
    StatCard.tsx
    IconBadge.tsx
    Tooltip.tsx
    Page.tsx
    Toast.tsx                   # extracted from useToasts
hooks/
  useAlertsStore.ts             # persisted
  useToasts.tsx                 # kept
  useTheme.ts                   # locked to light
  useTimeRange.tsx              # kept
  useCommandPalette.ts          # kept
  useLocalStorage.ts            # new
  useGoToShortcuts.ts           # new
lib/
  cn.ts                         # kept
  format.ts                     # kept
  storage.ts                    # new
data/
  seed.ts                       # kept (extend with fim, threat intel)
styles/
  globals.css                   # rewritten for light system
types/
  index.ts                      # extend with FimReviewState, AgentIsolation
```

---

## 9. Testing

### 9.1 Unit (Vitest)

- `lib/storage.ts` — namespacing, SSR-safety (jsdom), clear().
- `hooks/useLocalStorage.ts` — fallback during SSR, write/read, cross-tab sync.
- `hooks/useAlertsStore.ts` — ack/archive/toggle/setVulnStatus/reset write to storage.
- `lib/format.ts` — relative time, compact, number.
- `types/index.ts` — `severityBucket`, `severityLabel`, `severityShort`.

### 9.2 Component (Vitest + Testing Library)

- `Button` — all variants render, click fires, disabled blocks click.
- `Drawer` — opens, ESC closes, backdrop closes, focus returns to trigger.
- `Table` — empty state renders, row click fires, selectable rows work.
- `ConfirmDialog` — cancel/confirm callbacks fire, danger variant styling.
- `Tabs` — keyboard nav, `aria-selected` correct.
- `StatCard` — renders all slots.

### 9.3 Page smoke (existing `react-doctor`)

- `npx react-doctor` already in devDeps — run on each page.

### 9.4 Manual

- Light pass through each page, each filter, each drawer, each keyboard shortcut, Refresh on Overview, Reset to defaults in Settings.

---

## 10. Dependencies

- **Add**: `@tanstack/react-virtual` (for `/logs` virtualization).
- **Add (dev)**: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`.
- **Keep**: next 14.2.15, react 18.3.1, tailwindcss 3.4.13, recharts 2.13.0, lucide-react 0.453.0, clsx 2.1.1, tailwind-merge 2.5.4.
- **Remove**: the dark-theme-only Tailwind tokens and `scanline` class (replaced).

---

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Existing `app/page.tsx` (Overview) is large and tightly coupled to dark theme | Refactor incrementally: swap primitives one section at a time; never break the build mid-refactor. |
| `useAlertsStore` is module-scope — SSR will read seed state on server, then client hydrates from localStorage and mismatches | Render a `<NoSSR>` wrapper around any component that reads from the store, or accept a brief hydration flash (most pages are `"use client"` already). |
| Recharts default theming is dark-friendly | Pass explicit `stroke`/`fill` props in the light palette; disable animations for accessibility. |
| `npx react-doctor` may flag accessibility issues with the new components | Run it after each primitive lands; address findings before the next. |
| `@tanstack/react-virtual` adds bundle weight (~6KB) | Only imported on `/logs` page. |

---

## 12. Acceptance criteria

1. `npm run dev` starts without warnings; `npm run build` succeeds.
2. Every sidebar link navigates to a populated page (no "coming soon" stubs).
3. Acknowledging an alert on `/alerts` survives a page reload.
4. Toggling a rule on `/rules` survives a reload.
5. Marking a CVE as "patched" on `/vulnerabilities` survives a reload.
6. Reset to defaults in Settings clears all `sentinel-stack:v1:*` keys and re-hydrates from seed.
7. `⌘K` opens the command palette; `G A` navigates to `/alerts`; `?` opens help.
8. All charts use the new palette and animate only when `prefers-reduced-motion: no-preference`.
9. Every page passes `npx react-doctor` with no new errors.
10. `npm test` runs the unit + component suites green.
11. App background is `bg-app` (#F8FAFC) and never the old `#06080C` ink-950.

---

## 13. Out of scope reminders

- No real Wazuh API.
- No authentication.
- No dark mode in this iteration.
- No i18n.
- No mobile breakpoint tuning below 640px.
