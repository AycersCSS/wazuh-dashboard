// Test-only shim for the "server-only" package. The real package
// throws when imported outside a server context (it errors at
// build time if a client component imports it). In vitest+jsdom
// we run with no client/server distinction, so the real throw
// would fail every test that touches a server-only file. The
// shim is a no-op; the real protection happens at build time
// via Next.js's server/client component split.
export {};
