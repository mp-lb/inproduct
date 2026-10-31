import type { DataJob, DataJobState, DataJobSummary } from "../dataJobTypes.js";

export const summarizeJob = (
  job: DataJob,
  state: DataJobState,
): DataJobSummary => ({
  id: job.id,
  title: job.title,
  description: job.description,
  scope: job.scope,
  destructive: job.destructive,
  retryPolicy: job.retryPolicy,
  rerunSupported: job.retryPolicy === "safe_to_rerun",
  state,
});
