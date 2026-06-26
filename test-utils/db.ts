import { beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { resetDbForTesting, getDb } from "@/lib/db";
import { seedDatabase, SEED_TENANTS, SEED_USERS } from "@/data/seed";

/**
 * Test fixture: points the database at a unique temporary file so tests
 * run in isolation. Restores the original behaviour afterwards.
 *
 * Named with a lowercase prefix to avoid matching the
 * `react-hooks/rules-of-hooks` heuristic.
 */
export function withIsolatedDatabase() {
  const tmp = path.join(os.tmpdir(), `portal-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  process.env.PORTAL_DB_PATH = tmp;
  beforeEach(() => {
    resetDbForTesting();
    seedDatabase();
  });
  afterEach(() => {
    resetDbForTesting();
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
  });
}

export function db() { return getDb(); }
export const TENANTS = SEED_TENANTS;
export const USERS = SEED_USERS;
