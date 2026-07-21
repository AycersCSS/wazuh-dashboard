"use client";
import { useCallback, useEffect, useState } from "react";
import { storage } from "@/lib/storage";

export function useLocalStorage<T>(
  key: string,
  fallback: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Lazy initializer: read storage once on mount, fall back on the server.
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return fallback;
    return storage.get<T>(key, fallback);
  });

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
