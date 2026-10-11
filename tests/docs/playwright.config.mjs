import { defineConfig } from "@playwright/test";
import { createServer } from "node:net";
import process from "node:process";
import { URL } from "node:url";

const socket = createServer();
await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve));
const port = process.env.DOCS_TEST_PORT || String(socket.address().port);
process.env.DOCS_TEST_PORT = port;
await new Promise((resolve) => socket.close(resolve));
const baseURL = process.env.TEST_DOCS_URL || `http://127.0.0.1:${port}`;

// Playwright requires a default configuration export.
// eslint-disable-next-line import/no-default-export
export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.mjs",
  workers: 1,
  use: { baseURL, channel: process.env.PLAYWRIGHT_CHANNEL || "chrome" },
  webServer: process.env.TEST_DOCS_URL
    ? undefined
    : {
        command: "pnpm --filter @mp-lb/inproduct-docs start",
        cwd: new URL("../../", import.meta.url).pathname,
        env: { DOCS_PORT: String(port) },
        url: baseURL,
        reuseExistingServer: false,
      },
});
