# Dashboard — Design Reference

## Overview

Dark theme dashboard with grey backgrounds and green accents, prioritizing readability with clean sans-serif type.

---

## Color Palette

| Token     | Hex       | Usage                                |
|-----------|-----------|--------------------------------------|
| `--bg`    | `#121212` | Page background, sidebar             |
| `--bg-1`  | `#1e1e1e` | Card backgrounds                     |
| `--bg-2`  | `#2a2a2a` | Active nav item, badge backgrounds   |
| `--border`| `#3a3a3a` | Borders                              |
| `--muted` | `#9a9a9a` | Secondary/muted text                 |
| `--text`  | `#F3E4C9` | Primary body text                    |
| `--text2` | `#D3D4C0` | Secondary headings, nav text         |
| `--accent`| `#5BD0A0` | Primary accent, active indicators, CTA buttons |
| `--red`   | `#FF5C75` | High severity, danger badges         |
| `--orange`| `#FF9A4D` | Medium-high severity                 |
| `--yellow`| `#F5C04A` | Medium severity                      |
| `--green` | `#5BD0A0` | Low severity (same as accent)        |

Selection highlight uses `rgba(91, 208, 160, 0.30)`.

---

## Typography

| Family    | Stack                                          | Usage                  |
|-----------|------------------------------------------------|------------------------|
| Sans      | `Segoe UI, Arial, Helvetica, system-ui, sans` | Body text, headings    |
| Mono      | `Consolas, Courier New, ui-monospace, monospace` | Numbers, codes, identifiers |

- Base size: `14px`
- Headings: `500` weight, tight letter-spacing (`-0.02em`)
- Uppercase labels: `0.06em–0.18em` letter-spacing
- Tabular numbers: `font-variant-numeric: tabular-nums` on body, table, `.num`
- Smoothing: `antialiased` + `optimizeLegibility`

---

## Layout

```
┌──────────┬──────────────────────────────────────────┐
│          │  Topbar (sticky, 56px, glass effect)     │
│ Sidebar  ├──────────────────────────────────────────┤
│ 260px    │  Breadcrumb bar (28px)                   │
│ sticky   ├──────────────────────────────────────────┤
│          │                                          │
│          │  Page content (scrollable)               │
│          │   ┌─ Hero / summary section ────────┐   │
│          │   ├── KPI stat cards (grid) ────────┤   │
│          │   ├── Multi-column content ─────────┤   │
│          │   ├── Data table ───────────────────┤   │
│          │   └── Additional (show/hide) ───────┘   │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

- **Sidebar**: `position: sticky; top: 0; height: 100vh`. Brand header + scrollable nav sections. Active item has a 2px accent left-border.
- **Topbar**: `position: sticky; top: 0; z-index: 30`. Semi-transparent background (`rgba(18,18,18,0.95)`) with `backdrop-filter: blur(8px)`. Contains title, stats pills, icon buttons, user dropdown.
- **Page**: Padded `24px 32px`, vertically scrollable.

---

## Components

### Cards (`.card`)
- Background: `--bg-1`, border: `1px solid --border`, radius: `10px`
- Padding: `20px` (`.card-sm`: `16px`)
- Header: flex row with title (`.card-title`, `15px`, `--text2`) and optional subtitle (`.card-subtitle`, `12px`, `--muted`)

### Buttons (`.btn`)
- Height: `34px`, radius: `8px`, font: `13px / 500`
- `.btn-primary`: accent bg + dark text, hover darkens
- `.btn-secondary`: transparent + border, hover adds bg
- `.btn-sm`: `28px` tall, `12px` font, `6px` radius

### Stat Cards (`.stat-*`)
- `.stat-label`: `11.5px`, uppercase, `--muted`
- `.stat-value`: `28px`, mono font, `--text`
- `.stat-change`: `11px`, mono, `.up` = accent, `.down` = red

### List Items (`.list-row`)
- Flex row, `12px` gap, bottom border divider
- Leading indicator bar (`.indicator`): 3px-wide severity bar (red/orange/yellow/green)
- `.list-title`: `13px`, `--text`, single-line ellipsis
- `.list-meta`: `11px`, `--muted`
- `.list-tag`: `11px`, mono, `--muted`

### Badges (`.badge`)
- Height: `22px`, radius: `4px`, `10.5px` font
- Variants: `.badge-low` / `.badge-info` / `.badge-high` / `.badge-critical`
- Each uses `rgba(N, N, N, 0.16)` bg + border + solid text color

### Tables
- Full-width, `12.5px` font, collapsed borders
- `th`: `10.5px` uppercase, `--muted`, bottom border
- `td`: `12px` padding, bottom border, row hover bg `rgba(42,42,42,0.5)`

### Gauge / Ring
- SVG ring with `--bg-2` track and `--accent` arc
- Value in mono font in center
- Label + sub-label next to the ring

### Status Dots (`.dot`)
- `6px` circles, used for online/offline/pending status

---

## Navigation / Interaction (JS)

- Client-side SPA-style routing via a map of nav labels to section IDs
- Clicking a nav item hides all sections, then shows the target
- "Dashboard"/home shows all sections (with some hidden by default)
- Individual nav items show their section full-width (`.grid-2` becomes `1fr`)
- Active nav item gets `.active` class with accent left-border
- Action buttons ("View all", "Manage") can be wired to navigate to specific sections
- Placeholder sections can be hidden by default and toggled via nav

---

## Responsive Breakpoints

| Width    | Behavior                                    |
|----------|---------------------------------------------|
| ≤1200px  | 4-column grid → 2 columns                   |
| ≤768px   | Sidebar hidden, page padding `16px`, all grids → 1 column |

---

## Scrollbar Styling

- Width: `10px`
- Track: transparent
- Thumb: `#444`, `6px` radius, `2px` transparent border (content-box clip)
- Hover: `#555`

---

## File Reference

- `usr-dashboard/index.html` — HTML structure + inline JS
- `usr-dashboard/style.css` — All styles via CSS custom properties

All colors, spacing, and typography are controlled through `:root` custom properties in `style.css`.
