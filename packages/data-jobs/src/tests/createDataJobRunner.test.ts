import { describe, expect, it } from "vitest";
import { createDataJobRunner } from "../runner/createDataJobRunner";
import { createFakeJob } from "./createFakeJob";

describe("createDataJobRunner", () => {
  it("lists metadata, inspects with a token and runs then verifies", async () => {
    const { job } = createFakeJob();
    const runner = createDataJobRunner({ jobs: [job] });
    expect(runner.list()).toEqual([
      expect.objectContaining({
        id: "clear-pending",
        rerunSupported: true,
        state: { status: "idle" },
      }),
    ]);

    const preview = await runner.inspect(job.id);
    expect(preview.inspection.matchedCount).toBe(3);
    const progress: number[] = [];

    const result = await runner.run(
      { id: job.id, confirmationToken: preview.confirmationToken },
      (value) => progress.push(value.completed),
    );

    expect(result).toMatchObject({
      status: "succeeded",
      verification: { passed: true },
    });

    expect(progress).toEqual([1, 2, 3]);
    expect(runner.get(job.id).state).toEqual(result);
  });

  it("requires a fresh, single-use confirmation token", async () => {
    let time = 0;
    const { job } = createFakeJob();

    const runner = createDataJobRunner({
      jobs: [job],
      confirmationTtlMs: 1000,
      now: () => time,
    });

    await expect(
      runner.run({ id: job.id, confirmationToken: "guess" }),
    ).rejects.toMatchObject({
      code: "CONFIRMATION_REQUIRED",
    });

    const stale = await runner.inspect(job.id);
    const fresh = await runner.inspect(job.id);
    await expect(
      runner.run({ id: job.id, confirmationToken: stale.confirmationToken }),
    ).rejects.toThrow("Inspect the job again");

    await runner.run({
      id: job.id,
      confirmationToken: fresh.confirmationToken,
    });

    await expect(
      runner.run({ id: job.id, confirmationToken: fresh.confirmationToken }),
    ).rejects.toMatchObject({
      code: "CONFIRMATION_REQUIRED",
    });

    const expiring = await runner.inspect(job.id);
    time = 1000;
    await expect(
      runner.run({ id: job.id, confirmationToken: expiring.confirmationToken }),
    ).rejects.toMatchObject({
      code: "CONFIRMATION_REQUIRED",
    });
  });

  it("requires accepting data loss for destructive jobs", async () => {
    const { job, data } = createFakeJob({ destructive: true });
    const runner = createDataJobRunner({ jobs: [job] });
    const preview = await runner.inspect(job.id);
    await expect(
      runner.run({ id: job.id, confirmationToken: preview.confirmationToken }),
    ).rejects.toThrow("Accept data loss");

    expect(data.pending).toBe(3);
    const accepted = await runner.inspect(job.id);
    expect(
      (
        await runner.run({
          id: job.id,
          confirmationToken: accepted.confirmationToken,
          acceptDataLoss: true,
        })
      ).status,
    ).toBe("succeeded");
  });

  it("rejects a duplicate concurrent run of the same job", async () => {
    let release = () => undefined as void;

    const { job, data } = createFakeJob({
      run: () =>
        new Promise((resolve) => {
          release = () => {
            data.pending = 0;
            resolve({
              summary: "done",
              changedCount: 0,
              skippedCount: 0,
              changes: [],
            });
          };
        }),
    });

    const runner = createDataJobRunner({ jobs: [job] });
    const first = await runner.inspect(job.id);

    const running = runner.run({
      id: job.id,
      confirmationToken: first.confirmationToken,
    });

    expect(runner.get(job.id).state.status).toBe("running");
    const second = await runner.inspect(job.id);
    await expect(
      runner.run({ id: job.id, confirmationToken: second.confirmationToken }),
    ).rejects.toMatchObject({
      code: "ALREADY_RUNNING",
    });

    release();
    expect((await running).status).toBe("succeeded");
  });

  it("reports failures with partial progress and whether rerun is supported", async () => {
    const safe = createFakeJob();

    const manual = createFakeJob({
      id: "manual-job",
      retryPolicy: "manual_recovery",
    });

    safe.data.fail = true;
    manual.data.fail = true;
    const runner = createDataJobRunner({ jobs: [safe.job, manual.job] });

    const failed = await runner.run({
      id: safe.job.id,
      confirmationToken: (await runner.inspect(safe.job.id)).confirmationToken,
    });

    expect(failed).toMatchObject({
      status: "failed",
      error: "storage unavailable",
      progress: { completed: 1, total: 3 },
      rerunSupported: true,
    });

    expect(
      await runner.run({
        id: "manual-job",
        confirmationToken: (await runner.inspect("manual-job"))
          .confirmationToken,
      }),
    ).toMatchObject({ status: "failed", rerunSupported: false });

    safe.data.fail = false;

    const rerun = await runner.run({
      id: safe.job.id,
      confirmationToken: (await runner.inspect(safe.job.id)).confirmationToken,
    });

    expect(rerun).toMatchObject({
      status: "succeeded",
      outcome: { changedCount: 2 },
    });
  });

  it("fails a run whose verification does not pass", async () => {
    const { job } = createFakeJob({
      verify: async () => ({
        passed: false,
        remainingCount: 1,
        summary: "1 remaining",
      }),
    });

    const runner = createDataJobRunner({ jobs: [job] });

    const result = await runner.run({
      id: job.id,
      confirmationToken: (await runner.inspect(job.id)).confirmationToken,
    });

    expect(result).toMatchObject({
      status: "failed",
      error: "Verification failed: 1 remaining",
      outcome: { changedCount: 3 },
      verification: { passed: false },
    });
  });

  it("rejects unknown, duplicate and malformed jobs", async () => {
    const { job } = createFakeJob();
    const runner = createDataJobRunner({ jobs: [job] });
    await expect(runner.inspect("missing")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    expect(() => createDataJobRunner({ jobs: [job, job] })).toThrow(
      "duplicate data job ID",
    );

    expect(() =>
      createDataJobRunner({ jobs: [{ ...job, id: "Bad ID" }] }),
    ).toThrow("invalid data job");

    expect(() =>
      createDataJobRunner({
        jobs: [{ ...job, retryPolicy: "automatic" as never }],
      }),
    ).toThrow("invalid data job");
  });
});
