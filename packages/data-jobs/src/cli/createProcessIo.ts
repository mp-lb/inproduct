import { createInterface } from "node:readline/promises";
import type { CliIo } from "./cliIo.js";

export const createProcessIo = (): CliIo => ({
  write: (text) => process.stdout.write(`${text}\n`),
  writeError: (text) => process.stderr.write(`${text}\n`),
  ask: process.stdin.isTTY
    ? async (question) => {
        const prompt = createInterface({
          input: process.stdin,
          output: process.stderr,
        });

        try {
          return await prompt.question(question);
        } finally {
          prompt.close();
        }
      }
    : undefined,
});
