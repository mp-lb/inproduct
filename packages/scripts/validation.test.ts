import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout } from "node:timers/promises";
import { test } from "node:test";
import { splitShellWords } from "./validation/splitShellWords";
import { validationEnvironment } from "./validation/validationEnvironment";
import { runValidation } from "./validation/runValidation";

const fixture = fileURLToPath(
  new URL("validation/fixture.ts", import.meta.url),
);

const command = (
  mode: string,
  directory: string,
  log: string,
  name?: string,
) => [
  "--import",
  "tsx",
  fixture,
  mode,
  directory,
  log,
  ...(name ? [name] : []),
];

const finished = (child: ChildProcess) =>
  new Promise<number | null>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });

const waitForFile = async (path: string) => {
  for (let i = 0; i < 100; i++) {
    if (existsSync(path)) return;
    await setTimeout(50);
  }

  throw new Error(`Fixture did not start: ${path}`);
};

test("heap normalization preserves quoted flags and replaces every inherited heap setting", () => {
  const result = validationEnvironment(4096, {
    NODE_OPTIONS:
      '--trace-warnings --max_old_space_size 999 --require="a b" --max-old-space-size-percentage=90',
    KEEP: "yes",
  });

  assert.equal(
    result.NODE_OPTIONS,
    '"--trace-warnings" "--require=a b" "--max-old-space-size=4096"',
  );

  assert.equal(result.TURBO_CONCURRENCY, "1");
  assert.equal(result.KEEP, "yes");
  assert.deepEqual(splitShellWords("'a b' c\\ d \"e\\\"f\" ''"), [
    "a b",
    "c d",
    'e"f',
    "",
  ]);

  assert.throws(() => splitShellWords("'unfinished"), /Unclosed/);
});

test("two processes serialize on the same persistent lock inode", async () => {
  const directory = mkdtempSync(join(tmpdir(), "validation-test-"));
  const log = join(directory, "events");

  const start = (name: string) =>
    spawn(
      process.execPath,
      command("runner", directory, process.execPath).concat(
        command("record", directory, log, name),
      ),
      { stdio: "ignore" },
    );

  const first = start("first");
  const firstDone = finished(first);

  try {
    await waitForFile(log);
    const inode = statSync(join(directory, "heavy-job.lock")).ino;
    const second = start("second");
    assert.deepEqual(await Promise.all([firstDone, finished(second)]), [0, 0]);
    assert.equal(
      readFileSync(log, "utf8"),
      "first:start\nfirst:end\nsecond:start\nsecond:end\n",
    );

    assert.equal(statSync(join(directory, "heavy-job.lock")).ino, inode);
  } finally {
    first.kill("SIGKILL");
    rmSync(directory, { recursive: true, force: true });
  }
});

test("cancelling kills a stubborn process group before releasing the lock", async () => {
  const directory = mkdtempSync(join(tmpdir(), "validation-cancel-"));
  const log = join(directory, "pids");

  const runner = spawn(
    process.execPath,
    command("runner", directory, process.execPath).concat(
      command("tree", directory, log),
    ),
    { stdio: "ignore" },
  );

  const done = finished(runner);
  let pids: number[] = [];

  try {
    await waitForFile(log);
    pids = JSON.parse(readFileSync(log, "utf8"));
    runner.kill("SIGTERM");
    assert.equal(await done, 143);

    for (const pid of pids) {
      for (let i = 0; i < 50; i++) {
        try {
          process.kill(pid, 0);
        } catch {
          break;
        }

        await setTimeout(50);
      }

      assert.throws(() => process.kill(pid, 0));
    }

    assert.equal(
      await runValidation([process.execPath, "--version"], 2048, directory),
      0,
    );
  } finally {
    runner.kill("SIGKILL");

    for (const pid of pids) {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        /* Already stopped. */
      }
    }

    rmSync(directory, { recursive: true, force: true });
  }
});

test("missing commands retain exit 127 and release the lock", async () => {
  const directory = mkdtempSync(join(tmpdir(), "validation-missing-"));

  try {
    assert.equal(
      await runValidation([join(directory, "missing")], 2048, directory),
      127,
    );

    assert.equal(
      await runValidation([process.execPath, "--version"], 2048, directory),
      0,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("the child retains the lock after its wrapper is killed", async () => {
  const directory = mkdtempSync(join(tmpdir(), "validation-crash-"));
  const log = join(directory, "events");

  const first = spawn(
    process.execPath,
    command("runner", directory, process.execPath).concat(
      command("record", directory, log, "first"),
      "1000",
    ),
    { stdio: "ignore" },
  );

  const firstDone = finished(first);

  try {
    await waitForFile(log);
    first.kill("SIGKILL");
    await firstDone;

    const second = spawn(
      process.execPath,
      command("runner", directory, process.execPath).concat(
        command("record", directory, log, "second"),
      ),
      { stdio: "ignore" },
    );

    assert.equal(await finished(second), 0);
    assert.equal(
      readFileSync(log, "utf8"),
      "first:start\nfirst:end\nsecond:start\nsecond:end\n",
    );
  } finally {
    first.kill("SIGKILL");
    rmSync(directory, { recursive: true, force: true });
  }
});
