import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  build: { outDir: "dist", target: "es2022" },
  server: { host: true },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
