import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Lets the client call same-origin /api/* in dev too; server still reads the key.
      "/api": {
        target: "http://localhost:5174",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
