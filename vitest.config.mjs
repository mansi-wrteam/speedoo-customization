import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Test-only config. `@/` mirrors the jsconfig alias so tests can import app
// modules exactly as the app does.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{js,jsx,ts,tsx}", "migration-baseline/tests/**/*.test.{js,jsx,ts,tsx}"],
  },
});
