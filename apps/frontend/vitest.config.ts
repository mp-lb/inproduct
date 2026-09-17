import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import reactConfig from "@mp-lb/fssstack-testing/vitest/react";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(reactConfig, defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
}));
