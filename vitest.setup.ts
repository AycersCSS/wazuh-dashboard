import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server, startMocks, stopMocks } from "./mocks/server";

beforeAll(() => startMocks());
afterEach(() => {
  // Reset per-test handlers. The default set in mocks/handlers.ts
  // is the project-wide default; individual tests can add their
  // own handlers via server.use() without affecting siblings.
});
afterAll(() => stopMocks());

// Re-export for tests that need direct access (rare).
export { server };
