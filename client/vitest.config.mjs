import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: new URL(".", import.meta.url).pathname,
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.spec.{js,jsx}"],
    setupFiles: ["./src/vitest.setup.js"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/components/**", "src/hooks/**"],
      exclude: ["src/**/*.spec.*", "src/components/effects/**"],
      reporter: ["text-summary", "lcov"],
      reportsDirectory: "./coverage",
    },
  },
});
