import type { DataJob } from "../dataJobTypes";

/** An in-memory job over a counter; `fail` makes the next run throw after one step. */
export const createFakeJob = (overrides: Partial<DataJob> = {}) => {
  const data = { pending: 3, fail: false };

  const job: DataJob = {
    id: "clear-pending",
    title: "Clear pending",
    description: "Clears pending items.",
    scope: "Test counter",
    destructive: false,
    retryPolicy: "safe_to_rerun",
    inspect: async () => ({
      summary: `${data.pending} pending`,
      matchedCount: data.pending,
      changes: [{ label: "Clear item", count: data.pending }],
      warnings: [],
    }),
    run: async ({ reportProgress }) => {
      const total = data.pending;
      let completed = 0;

      while (data.pending > 0) {
        data.pending--;
        reportProgress({ completed: ++completed, total });
        if (data.fail) throw new Error("storage unavailable");
      }

      return {
        summary: `Cleared ${completed}`,
        changedCount: completed,
        skippedCount: 0,
        changes: [],
      };
    },
    verify: async () => ({
      passed: data.pending === 0,
      remainingCount: data.pending,
      summary: `${data.pending} remaining`,
    }),
    ...overrides,
  };

  return { job, data };
};
