"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const map: Record<string, string> = {
  O: "/",
  M: "/microsoft-365",
  N: "/ninjaone",
  B: "/bitdefender",
  C: "/cyber-essentials",
  P: "/customer-portal",
  A: "/alerts",
  R: "/agents",
  V: "/vulnerabilities",
  F: "/fim",
  L: "/compliance",
  T: "/mitre",
  U: "/rules",
  G: "/logs",
  I: "/threat-intel",
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
      if (k === "?" ) { armed = null; if (timer) clearTimeout(timer); return; }
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
