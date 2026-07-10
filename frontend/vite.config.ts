import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In Docker the backend is reachable as the "backend" compose service; natively
// it's on localhost. Configurable via env so the same config works for both.
const apiTarget = process.env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:8000";
// Bind-mounted files on macOS don't emit fs events into a Linux container, so
// HMR needs polling there. Off by default (native dev uses native events).
const usePolling = process.env.VITE_USE_POLLING === "1";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward API calls to the Django server so the frontend can use relative
    // "/api/..." URLs (no CORS, no hardcoded host).
    proxy: {
      "/api": apiTarget,
    },
    watch: usePolling ? { usePolling: true } : undefined,
  },
});
