import { describe, expect, it } from "vitest";
import { runDataJobsCli } from "../cli/runDataJobsCli";
import { createDataJobRunner } from "../runner/createDataJobRunner";
import { createFakeJob } from "./createFakeJob";
import { createTestIo } from "./createTestIo";

const setup = (overrides = {}) => {
  const fake = createFakeJob(overrides);
  return { ...fake, runner: createDataJobRunner({ jobs: [fake.job] }) };
};

describe("runDataJobsCli", () => {
  it("lists and inspects as human text or one JSON value", async () => {
    const { runner } = setup();
    const human = createTestIo();
    expect(await runDataJobsCli({ runner, args: ["list"], io: human.io })).toBe(
      0,
    );

    expect(human.out.join("\n")).toContain("clear-pending  Clear pending");

    const json = createTestIo();
    expect(
      await runDataJobsCli({
        runner,
        args: ["inspect", "clear-pending", "--json"],
        io: json.io,
      }),
    ).toBe(0);

    const preview = JSON.parse(json.out.join(""));
    expect(preview.inspection.matchedCount).toBe(3);
    expect(preview).not.toHaveProperty("confirmationToken");
  });

  it("runs after --yes, streams progress to stderr and verifies", async () => {
    const { runner, data } = setup();
    const { io, out, err } = createTestIo();
    expect(
      await runDataJobsCli({
        runner,
        args: ["run", "clear-pending", "--yes"],
        io,
      }),
    ).toBe(0);

    expect(data.pending).toBe(0);
    expect(err).toContain("Progress: 3 of 3");
    expect(out.join("\n")).toContain("Verification passed: 0 remaining");
  });

  it("prompts for the job ID and runs nothing on a mismatch or without a terminal", async () => {
    const { runner, data } = setup();
    const wrong = createTestIo(["nope"]);
    expect(
      await runDataJobsCli({
        runner,
        args: ["run", "clear-pending"],
        io: wrong.io,
      }),
    ).toBe(1);

    expect(data.pending).toBe(3);
    const blocked = createTestIo(["clear-pending"]);
    expect(
      await runDataJobsCli({
        runner,
        args: ["run", "clear-pending", "--noninteractive"],
        io: blocked.io,
      }),
    ).toBe(1);

    expect(blocked.err.join("\n")).toContain("Pass --yes");
    expect(data.pending).toBe(3);

    const typed = createTestIo(["clear-pending"]);
    expect(
      await runDataJobsCli({
        runner,
        args: ["run", "clear-pending"],
        io: typed.io,
      }),
    ).toBe(0);

    expect(data.pending).toBe(0);
  });

  it("requires --accept-data-loss for destructive jobs", async () => {
    const { runner, data } = setup({ destructive: true });
    const refused = createTestIo();
    expect(
      await runDataJobsCli({
        runner,
        args: ["run", "clear-pending", "--yes"],
        io: refused.io,
      }),
    ).toBe(1);

    expect(refused.err.join("\n")).toContain("--accept-data-loss");
    expect(data.pending).toBe(3);
    const accepted = createTestIo();
    expect(
      await runDataJobsCli({
        runner,
        args: ["run", "clear-pending", "--yes", "--accept-data-loss", "--json"],
        io: accepted.io,
      }),
    ).toBe(0);

    expect(JSON.parse(accepted.out.join("")).result.status).toBe("succeeded");
  });

  it("exits non-zero with recovery guidance when a run fails", async () => {
    const { runner, data } = setup({ retryPolicy: "manual_recovery" });
    data.fail = true;
    const { io, out } = createTestIo();
    expect(
      await runDataJobsCli({
        runner,
        args: ["run", "clear-pending", "-y"],
        io,
      }),
    ).toBe(1);

    expect(out.join("\n")).toContain("Error: storage unavailable");
    expect(out.join("\n")).toContain("Rerun is not supported");
  });

  it("verifies, reports unknown jobs and exposes help and version", async () => {
    const { runner } = setup();
    const verify = createTestIo();
    expect(
      await runDataJobsCli({
        runner,
        args: ["verify", "clear-pending"],
        io: verify.io,
      }),
    ).toBe(1);

    const missing = createTestIo();
    expect(
      await runDataJobsCli({
        runner,
        args: ["inspect", "missing"],
        io: missing.io,
      }),
    ).toBe(1);

    expect(missing.err).toEqual(["Error: Unknown data job: missing"]);
    const help = createTestIo();
    expect(
      await runDataJobsCli({ runner, args: ["run", "--help"], io: help.io }),
    ).toBe(0);

    expect(help.out.join("\n")).toContain("--accept-data-loss");
    const version = createTestIo();
    expect(
      await runDataJobsCli({
        runner,
        args: ["--version"],
        version: "1.2.3",
        io: version.io,
      }),
    ).toBe(0);

    expect(version.out).toEqual(["1.2.3"]);
  });
});
