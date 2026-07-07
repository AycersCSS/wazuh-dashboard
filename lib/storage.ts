// Namespace was previously "sentinel-stack:v1" (copy-paste from another
// project). Fixed to "wazuh-dashboard:v1" to avoid localStorage key
// collisions if both projects ever run on the same origin.
const NS = "wazuh-dashboard:v1";

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
  /**
   * Removes every wazuh-dashboard:v1:* key from localStorage except the ones
   * listed in `preserve`. By default the audit log and selected-tenant
   * settings survive the reset so the data.reset_defaults event is
   * self-attesting — the last record in the log IS the reset itself, and
   * the target tenant selection survives to re-scope the fresh seed.
   */
  clear(preserve: string[] = ["audit", "selected-tenant"]): void {
    if (typeof window === "undefined") return;
    const preserveKeys = new Set(preserve.map(p => `${NS}:${p}`));
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(`${NS}:`) && !preserveKeys.has(key)) toRemove.push(key);
    }
    toRemove.forEach(key => window.localStorage.removeItem(key));
  }
};
