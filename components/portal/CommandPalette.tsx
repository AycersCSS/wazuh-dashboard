"use client";
import { useEffect, useReducer, useRef, useMemo } from "react";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { useGoToShortcuts } from "@/hooks/useGoToShortcuts";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

type Hit = {
  id: string;
  type: "page";
  label: string;
  hint: string;
  href: string;
  group: "Go to";
};

const pages: Hit[] = [
  { id: "p1",  type: "page", label: "Dashboard",       hint: "Your security snapshot",           href: "/",                group: "Go to" },
  { id: "p2",  type: "page", label: "Alerts",          hint: "Security events for your tenant",  href: "/alerts",          group: "Go to" },
  { id: "p3",  type: "page", label: "Agents",          hint: "Endpoints under management",       href: "/agents",          group: "Go to" },
  { id: "p4",  type: "page", label: "Vulnerabilities", hint: "CVEs detected on your fleet",      href: "/vulnerabilities", group: "Go to" },
  { id: "p5",  type: "page", label: "File integrity",  hint: "File system change events",        href: "/fim",             group: "Go to" },
  { id: "p6",  type: "page", label: "Rules",           hint: "Detection rules in use",           href: "/rules",           group: "Go to" },
  { id: "p7",  type: "page", label: "Compliance",      hint: "Framework coverage",               href: "/compliance",      group: "Go to" },
  { id: "p8",  type: "page", label: "Threat intel",    hint: "Actors relevant to your sector",   href: "/threat-intel",    group: "Go to" },
  { id: "p9",  type: "page", label: "MITRE ATT&CK",    hint: "Detections mapped to ATT&CK",      href: "/mitre",           group: "Go to" },
  { id: "p10", type: "page", label: "Logs",            hint: "Live agent log stream",            href: "/logs",            group: "Go to" }
];

type State = { q: string; idx: number };
type Action =
  | { type: "open" }
  | { type: "close" }
  | { type: "setQ"; q: string }
  | { type: "setIdx"; idx: number };

function paletteReducer(s: State, a: Action): State {
  switch (a.type) {
    case "open":  return { q: "", idx: 0 };
    case "close": return s;
    case "setQ":  return { q: a.q, idx: 0 };
    case "setIdx": return { ...s, idx: a.idx };
  }
}

export function CommandPalette() {
  // Mount the global G+X shortcut listener so the palette / shortcuts work
  // even when the palette is closed.
  useGoToShortcuts();

  const { open, setOpen } = useCommandPalette();
  const [state, dispatch] = useReducer(paletteReducer, { q: "", idx: 0 });
  const { q, idx } = state;
  const setQ = (q: string) => dispatch({ type: "setQ", q });
  const setIdx = (idx: number) => dispatch({ type: "setIdx", idx });
  const ref = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    dispatch({ type: "open" });
    const id = window.setTimeout(() => ref.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [open]);

  const results = useMemo<Hit[]>(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return pages;
    return pages.filter(p =>
      p.label.toLowerCase().includes(needle) ||
      p.hint.toLowerCase().includes(needle)
    );
  }, [q]);

  if (!open) return null;

  function choose(h: Hit) {
    setOpen(false);
    router.push(h.href);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx(Math.min(idx + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setIdx(Math.max(idx - 1, 0)); }
    if (e.key === "Enter")     { e.preventDefault(); if (results[idx]) choose(results[idx]); }
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Command palette">
      <button
        type="button"
        aria-label="Close command palette"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
      />
      <div className="relative mx-auto mt-[10vh] w-[min(640px,92vw)] bg-navy-100 border border-navy-400 rounded-xl shadow-pop overflow-hidden">
        <div className="flex items-center gap-2.5 h-12 px-3 border-b border-navy-400">
          <span className="text-navy-600 text-[12px]">/</span>
          <input
            ref={ref}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search portal pages"
            aria-label="Search portal pages"
            className="flex-1 bg-transparent outline-none text-[13px] text-cream placeholder:text-navy-600"
          />
          <span className="kbd">esc</span>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-1.5">
          {results.length === 0 ? (
            <div className="px-4 py-10 text-center text-navy-600 text-[12.5px]">
              No matches for <span className="font-mono text-cream">&quot;{q}&quot;</span>
            </div>
          ) : (
            <div className="py-1">
              <div className="px-3 py-1 text-[10.5px] uppercase tracking-wider text-navy-600 font-semibold">Go to</div>
              {results.map((h, i) => {
                const active = i === idx;
                return (
                  <button
                    type="button"
                    key={h.id}
                    onMouseEnter={() => setIdx(i)}
                    onClick={() => choose(h)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 h-9 text-left",
                      active ? "bg-navy-100" : ""
                    )}
                  >
                    <span className={cn("flex-none text-[10px] uppercase", active ? "text-emerald-400" : "text-navy-600")}>{h.type}</span>
                    <span className="flex-1 text-[12.5px] text-cream truncate">{h.label}</span>
                    <span className="hidden md:block text-[11px] text-navy-600 truncate max-w-[40%]">{h.hint}</span>
                    {active && <span className="text-emerald-400">&gt;</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between h-9 px-3 border-t border-navy-400 text-[10.5px] text-navy-600">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="kbd">^</span><span className="kbd">v</span> navigate</span>
            <span className="flex items-center gap-1"><span className="kbd">ret</span> open</span>
            <span className="flex items-center gap-1"><span className="kbd">esc</span> close</span>
          </div>
          <span>MergeIT Client Portal</span>
        </div>
      </div>
    </div>
  );
}
