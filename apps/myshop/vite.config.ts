import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Loopback only. This synthetic demo must never become a deployed service.
export default defineConfig({
  plugins: [react()],
  server: { host: "127.0.0.1" },
  preview: { host: "127.0.0.1" },
});
