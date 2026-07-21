"use client";

import { useCallback, useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";

export type Theme = "dark" | "light";

const STORAGE_KEY = "theme";
const HTML_CLASSES: Record<Theme, string[]> = {
  dark: ["dark"],
  light: ["light"],
};

/**
 * Theme controller. Stores the user's choice in localStorage and applies the
 * matching class to <html>. Defaults to "dark" so the SSR output matches the
 * existing pre-theme-toggle styling exactly (no flash of light theme on first
 * load). The dark class is on <html> by default in app/layout.tsx so SSR
 * markup is correct before this hook runs.
 *
 * The actual color overrides live in styles/globals.css under `.light` so the
 * existing component-level class names (bg-navy-100, text-cream, etc.) keep
 * working without per-component changes.
 */
export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void; toggleTheme: () => void } {
  const [theme, setTheme] = useLocalStorage<Theme>(STORAGE_KEY, "dark");

  // Apply the theme class to <html> whenever it changes. We keep both classes
  // absent in the "off" state to make it easy to read computed colors in
  // DevTools — but for our purposes, dark is the default.
  useEffect(() => {
    const html = document.documentElement;
    for (const [t, classes] of Object.entries(HTML_CLASSES) as [Theme, string[]][]) {
      for (const c of classes) html.classList.toggle(c, t === theme);
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  }, [setTheme]);

  return { theme, setTheme, toggleTheme };
}
