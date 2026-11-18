import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root,
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "http://localhost:5000" } },
  preview: { proxy: { "/api": "http://localhost:5000" } },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      // Stable vendor chunk: app releases don't invalidate the cached React/router download.
      output: { manualChunks: { react: ["react", "react-dom", "react-router-dom"] } },
    },
  },
});
