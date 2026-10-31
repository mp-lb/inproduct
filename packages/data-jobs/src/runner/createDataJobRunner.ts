import { DataJobError } from "../DataJobError.js";
import { defineDataJob } from "../defineDataJob.js";
import type {
  DataJob,
  DataJobPreview,
  DataJobProgress,
  DataJobResult,
  DataJobRunRequest,
  DataJobState,
  DataJobSummary,
  DataJobVerification,
} from "../dataJobTypes.js";
import { createConfirmations } from "./createConfirmations.js";
import { executeRun } from "./executeRun.js";
import { summarizeJob } from "./summarizeJob.js";

export type DataJobRunnerOptions = {
  jobs: DataJob[];
  /** How long an inspection's confirmation token stays valid. Defaults to five minutes. */
  confirmationTtlMs?: number;
  now?: () => number;
};

export type DataJobRunner = ReturnType<typeof createDataJobRunner>;

/** Executes registered jobs for the admin panel and CLI alike.
 * @remarks Duplicate runs are rejected only within this runner instance. Hosts running
 * several processes against one database must serialize runs themselves.
 */
export const createDataJobRunner = ({
  jobs,
  confirmationTtlMs = 5 * 60_000,
  now = Date.now,
}: DataJobRunnerOptions) => {
  const registry = new Map<string, DataJob>();

  for (const job of jobs.map(defineDataJob)) {
    if (registry.has(job.id))
      throw new TypeError(`duplicate data job ID: ${job.id}`);
    registry.set(job.id, job);
  }

  const states = new Map<string, DataJobState>();
  const confirmations = createConfirmations({ ttlMs: confirmationTtlMs, now });

  const find = (id: string) => {
    const job = registry.get(id);
    if (!job) throw new DataJobError("NOT_FOUND", `Unknown data job: ${id}`);
    return job;
  };

  const describe = (job: DataJob): DataJobSummary =>
    summarizeJob(job, states.get(job.id) ?? { status: "idle" });

  return {
    list: () => [...registry.values()].map(describe),
    get: (id: string) => describe(find(id)),
    inspect: async (id: string): Promise<DataJobPreview> => {
      const job = find(id);
      const inspection = await job.inspect();
      const confirmation = confirmations.issue(job.id);
      return {
        job: describe(job),
        inspection,
        confirmationToken: confirmation.token,
        expiresAt: new Date(confirmation.expiresAt).toISOString(),
      };
    },
    run: async (
      request: DataJobRunRequest,
      onProgress?: (progress: DataJobProgress) => void,
    ): Promise<DataJobResult> => {
      const job = find(request.id);
      if (states.get(job.id)?.status === "running")
        throw new DataJobError(
          "ALREADY_RUNNING",
          `${job.title} is already running.`,
        );
      if (job.destructive && request.acceptDataLoss !== true)
        throw new DataJobError(
          "CONFIRMATION_REQUIRED",
          `${job.title} deletes data. Accept data loss to run it.`,
        );
      if (!confirmations.consume(job.id, request.confirmationToken))
        throw new DataJobError(
          "CONFIRMATION_REQUIRED",
          "Inspect the job again and confirm the latest preview.",
        );

      const result = await executeRun({
        job,
        runId: crypto.randomUUID(),
        now,
        update: (state) => states.set(job.id, state),
        onProgress,
      });

      states.set(job.id, result);
      return result;
    },
    verify: (id: string): Promise<DataJobVerification> => find(id).verify(),
  };
};
