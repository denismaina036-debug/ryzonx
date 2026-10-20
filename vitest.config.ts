import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Database-backed PGlite suites can exceed Vitest's 5s default when the
    // complete suite runs concurrently on Windows. Keep the gate deterministic
    // without weakening any assertion.
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
