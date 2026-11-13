import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, ".") } },
  // e2e calls can hit a cold dev server that compiles routes on first request.
  test: { environment: "node", include: ["tests/**/*.test.ts"], testTimeout: 20_000 },
});
