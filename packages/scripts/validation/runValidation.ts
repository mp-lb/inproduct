import { spawn, type ChildProcess } from "node:child_process";
import { closeSync, mkdirSync, openSync } from "node:fs";
import { constants, tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import fsExt from "fs-ext";
import { validationEnvironment } from "./validationEnvironment";
import { stopGroup } from "./stopGroup";

export const runValidation = async (
  command: string[],
  heapMiB = 2048,
  directory = join(tmpdir(), `local-validation-${process.getuid!()}`),
): Promise<number> => {
  if (!command.length) throw new Error("A command is required after --");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  // Never unlink this file: old Python and new TypeScript runners must lock
  // the same inode, including across projects and worktrees.
  const fd = openSync(join(directory, "heavy-job.lock"), "a+", 0o600);
  let cancelled: NodeJS.Signals | undefined;
  let child: ChildProcess | undefined;
  let forceKill: ReturnType<typeof setTimeout> | undefined;
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGHUP"];

  const cancel = (signal: NodeJS.Signals) => {
    cancelled ??= signal;
    stopGroup(child?.pid, "SIGTERM");
    forceKill ??= setTimeout(() => stopGroup(child?.pid, "SIGKILL"), 3000);
    forceKill.unref();
  };

  for (const signal of signals) process.on(signal, cancel);

  try {
    let announced = false;

    while (!cancelled) {
      try {
        fsExt.flockSync(fd, "exnb");
        break;
      } catch (error) {
        if (
          !["EAGAIN", "EWOULDBLOCK"].includes(
            (error as NodeJS.ErrnoException).code ?? "",
          )
        )
          throw error;
        if (!announced)
          console.error(
            "[validation] Waiting for another heavy job to finish…",
          );
        announced = true;
        await delay(200);
      }
    }

    if (cancelled) return 128 + constants.signals[cancelled];
    console.error(
      `[validation] Starting; Node heap ${heapMiB} MiB/process, concurrency 1.`,
    );

    child = spawn(command[0], command.slice(1), {
      env: validationEnvironment(heapMiB),
      detached: true,
      // The child keeps the flock alive if its runner is killed abruptly.
      stdio: ["inherit", "inherit", "inherit", fd],
    });

    const result = await new Promise<number>((resolve) => {
      child!.once("error", (error: NodeJS.ErrnoException) => {
        console.error(
          error.code === "ENOENT"
            ? `[validation] Command not found: ${command[0]}`
            : error.message,
        );

        resolve(error.code === "ENOENT" ? 127 : 1);
      });

      child!.once("close", (code, signal) =>
        resolve(code ?? (signal ? 128 + constants.signals[signal] : 1)),
      );
    });

    return cancelled ? 128 + constants.signals[cancelled] : result;
  } finally {
    if (forceKill) clearTimeout(forceKill);
    if (child?.pid) stopGroup(child.pid, "SIGKILL");
    for (const signal of signals) process.removeListener(signal, cancel);
    closeSync(fd);
  }
};
