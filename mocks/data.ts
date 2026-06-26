import type { AlertBuckets } from "@/lib/connector/types";

export const MOCK_TENANTS = ["acme-corp", "globex-inc", "initech", "stark-industries"];
export const MOCK_AGENT_COUNT = 152;

function makeAlert(id: string, level: number, tenantIndex: number) {
  return {
    id,
    level,
    rule: { id: `R${level}${id}`, level, description: `Mock ${level}` },
    agent: { id: `a-${tenantIndex}-${id}`, name: `host-${tenantIndex}-${id}`, ip: "10.0.0.1" },
    timestamp: new Date().toISOString(),
    full_log: `mock log entry ${id}`
  };
}

export function mockAlertsFor(tenantId: string): AlertBuckets {
  const idx = MOCK_TENANTS.indexOf(tenantId);
  if (idx === -1) return { critical: [], high: [], warning: [], total: 0 };
  const critical = Array.from({ length: 2 + idx }, (_, i) => makeAlert(`c${i}`, 14, idx));
  const high = Array.from({ length: 5 + idx * 2 }, (_, i) => makeAlert(`h${i}`, 12, idx));
  const warning = Array.from({ length: 10 + idx * 3 }, (_, i) => makeAlert(`w${i}`, 9, idx));
  return { critical, high, warning, total: critical.length + high.length + warning.length };
}
