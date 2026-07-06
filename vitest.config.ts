import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    css: false
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // `server-only` throws on import outside a server context; vitest+jsdom
      // isn't a server context, so alias to a no-op for tests.
      "server-only": path.resolve(__dirname, "test-shims/server-only.ts")
    }
  }
});
