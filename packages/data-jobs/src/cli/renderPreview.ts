import type { DataJobPreview } from "../dataJobTypes.js";
import { describeRetryPolicy } from "../describeRetryPolicy.js";

export const renderPreview = ({ job, inspection }: DataJobPreview) =>
  [
    `${job.title} (${job.id})`,
    `Scope: ${job.scope}`,
    `Deletes data: ${job.destructive ? "yes" : "no"}`,
    `Retry: ${describeRetryPolicy(job.retryPolicy)}`,
    inspection.summary,
    ...inspection.changes.map((change) => `  ${change.label}: ${change.count}`),
    ...inspection.warnings.map((warning) => `Warning: ${warning}`),
  ].join("\n");
