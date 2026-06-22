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
