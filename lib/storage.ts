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
