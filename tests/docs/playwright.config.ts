import { defineConfig } from "@playwright/test";
import { createServer } from "node:net";
import process from "node:process";
import { URL } from "node:url";

const socket = createServer();
await new Promise<void>((resolve) => socket.listen(0, "127.0.0.1", resolve));
const address = socket.address();
if (!address || typeof address === "string")
  throw new Error("Could not allocate docs test port");
const port = process.env.DOCS_TEST_PORT || String(address.port);
process.env.DOCS_TEST_PORT = port;
await new Promise<void>((resolve, reject) =>
  socket.close((error) => (error ? reject(error) : resolve())),
);

const baseURL = process.env.TEST_DOCS_URL || `http://127.0.0.1:${port}`;

// Playwright requires a default configuration export.
// eslint-disable-next-line import/no-default-export
export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
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
