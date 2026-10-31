import type {
  DataJob,
  DataJobOutcome,
  DataJobProgress,
  DataJobResult,
  DataJobState,
  DataJobVerification,
} from "../dataJobTypes.js";
import { describeFailure } from "./describeFailure.js";

/** Runs then verifies a job, reporting state changes. Never throws: failures become results. */
export const executeRun = async ({
  job,
  runId,
  now,
  update,
  onProgress,
}: {
  job: DataJob;
  runId: string;
  now: () => number;
  update: (state: DataJobState) => void;
  onProgress?: (progress: DataJobProgress) => void;
}): Promise<DataJobResult> => {
  const startedAt = new Date(now()).toISOString();
  let progress: DataJobProgress | undefined;
  let outcome: DataJobOutcome | undefined;
  let verification: DataJobVerification | undefined;
  update({ status: "running", runId, startedAt });

  const reportProgress = (value: DataJobProgress) => {
    progress = { ...value };
    update({ status: "running", runId, startedAt, progress });
    onProgress?.(progress);
  };

  const fail = (error: string): DataJobResult => ({
    status: "failed",
    runId,
    startedAt,
    finishedAt: new Date(now()).toISOString(),
    error,
    ...(progress ? { progress } : {}),
    ...(outcome ? { outcome } : {}),
    ...(verification ? { verification } : {}),
    rerunSupported: job.retryPolicy === "safe_to_rerun",
  });

  try {
    outcome = await job.run({ reportProgress });
    verification = await job.verify();
  } catch (error) {
    return fail(describeFailure(error));
  }

  if (!verification.passed)
    return fail(`Verification failed: ${verification.summary}`);
  return {
    status: "succeeded",
    runId,
    startedAt,
    finishedAt: new Date(now()).toISOString(),
    outcome,
    verification,
  };
};
