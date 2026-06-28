import { describe, it, expect, beforeEach } from "vitest";
import { storage } from "../storage";

describe("storage", () => {
  beforeEach(() => localStorage.clear());

  it("returns fallback when key is missing", () => {
    expect(storage.get("missing", { a: 1 })).toEqual({ a: 1 });
  });

  it("round-trips a JSON value", () => {
    storage.set("k", { a: 1, b: "x" });
    expect(storage.get("k", null)).toEqual({ a: 1, b: "x" });
  });

  it("remove deletes a key", () => {
    storage.set("k", 1);
    storage.remove("k");
    expect(storage.get("k", "fallback")).toBe("fallback");
  });

  it("clear removes only namespaced keys, preserving audit and selected-tenant", () => {
    localStorage.setItem("other:key", "keep");
    storage.set("u1", 1);
    storage.set("u2", 2);
    storage.set("audit", [{ id: "evt-1", ts: new Date().toISOString(), actor: "ADMIN", tenant: null, scope: "auth", type: "auth.login", summary: "test" }]);
    storage.set("selected-tenant", "\"all\"");
    storage.clear();
    expect(localStorage.getItem("other:key")).toBe("keep");
    expect(storage.get("u1", null)).toBeNull();
    expect(storage.get("u2", null)).toBeNull();
    // Audit log and selected-tenant survive the reset
    expect(storage.get("audit", [])).not.toBeNull();
    expect(storage.get("selected-tenant", null)).not.toBeNull();
  });
});
