import { getDb } from "@/lib/db";
import type { Database } from "better-sqlite3";

export interface SeedTenant {
  id: string;
  name: string;
  slug: string;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum";
}

export interface SeedUser {
  id: string;
  email: string;
  name: string;
  tenant_id: string;
  role: "admin" | "analyst" | "viewer";
}

export const SEED_TENANTS: SeedTenant[] = [
  { id: "t_acme",    name: "Acme Industries",     slug: "acme",    tier: "Platinum" },
  { id: "t_stark",   name: "Stark Enterprises",   slug: "stark",   tier: "Gold"     },
  { id: "t_globex",  name: "Globex Corporation",  slug: "globex",  tier: "Silver"   },
  { id: "t_initech", name: "Initech",             slug: "initech", tier: "Bronze"   }
];

export const SEED_USERS: SeedUser[] = [
  { id: "u_acme_admin",  email: "admin@acme.test",      name: "Alice Acme",     tenant_id: "t_acme",    role: "admin"   },
  { id: "u_acme_view",   email: "viewer@acme.test",     name: "Alan Acme",      tenant_id: "t_acme",    role: "viewer"  },
  { id: "u_stark_admin", email: "admin@stark.test",     name: "Sarah Stark",    tenant_id: "t_stark",   role: "admin"   },
  { id: "u_globex_view", email: "viewer@globex.test",   name: "Greg Globex",    tenant_id: "t_globex",  role: "viewer"  },
  { id: "u_initech_view",email: "viewer@initech.test",  name: "Ivan Initech",   tenant_id: "t_initech", role: "viewer"  }
];

/**
 * Idempotently inserts the seed tenants and users.
 * Safe to call on every server start.
 */
export function seedDatabase(): void {
  const db = getDb();
  const insertTenant = db.prepare(`
    INSERT OR IGNORE INTO tenants (id, name, slug, tier)
    VALUES (@id, @name, @slug, @tier)
  `);
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, email, name, tenant_id, role)
    VALUES (@id, @email, @name, @tenant_id, @role)
  `);
  const tx = db.transaction((tenants: SeedTenant[], users: SeedUser[]) => {
    for (const t of tenants) insertTenant.run(t);
    for (const u of users) insertUser.run(u);
  });
  tx(SEED_TENANTS, SEED_USERS);
}

/** Mulberry32 deterministic PRNG, seeded so each tenant gets stable data. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit hash of a string (FNV-1a). Used to seed mulberry32 from tenant ids. */
export function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
