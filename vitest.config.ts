import { defineConfig } from "vitest/config";
import path from "node:path";

// `tsconfig.json` sets `jsx: "preserve"` (Next.js compiles app code itself), but
// vitest 4 defaults to the oxc transform, which inherits `jsx: preserve` and then
// fails when vite's import-analysis re-parses the raw JSX in *.test.tsx. oxc does
// not honour this esbuild block, so disable it (`oxc: false`) and let esbuild
// (which respects `jsx: "automatic"`) transform test files instead.
export default defineConfig({
  oxc: false,
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react"
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    css: false
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // `server-only` throws on import outside a server context;
      // vitest+jsdom isn't a server context, so alias to a no-op
      // for tests. The build still uses the real package via the
      // bundler's resolution.
      "server-only": path.resolve(__dirname, "test-shims/server-only.ts")
    }
  }
});
