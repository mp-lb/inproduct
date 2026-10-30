import { appendFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { setTimeout } from "node:timers/promises";
import { runValidation } from "./runValidation";

const [mode, directory, log, name = "job"] = process.argv.slice(2);
const self = fileURLToPath(import.meta.url);
if (mode === "runner") {
  process.exitCode = await runValidation(
    process.argv.slice(4),
    2048,
    directory,
  );
} else if (mode === "record") {
  appendFileSync(log, `${name}:start\n`);
  await setTimeout(Number(process.argv[6] ?? 350));
  appendFileSync(log, `${name}:end\n`);
} else if (mode === "tree") {
  process.on("SIGTERM", () => {});

  const leaf = spawn(process.execPath, ["--import", "tsx", self, "leaf"], {
    stdio: "ignore",
  });

  writeFileSync(log, JSON.stringify([process.pid, leaf.pid]));
  setInterval(() => {}, 1000);
} else if (mode === "leaf") {
  process.on("SIGTERM", () => {});
  setInterval(() => {}, 1000);
} else if (mode === "environment") {
  writeFileSync(
    log,
    JSON.stringify({
      options: process.env.NODE_OPTIONS,
      concurrency: process.env.TURBO_CONCURRENCY,
    }),
  );
} else throw new Error("Unknown validation fixture mode");
