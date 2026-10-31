import type { DataJobSummary } from "../dataJobTypes.js";
import { describeRetryPolicy } from "../describeRetryPolicy.js";

export const renderSummaries = (jobs: DataJobSummary[]) =>
  jobs.length
    ? jobs
        .map((job) =>
          [
            `${job.id}  ${job.title}${job.destructive ? "  [deletes data]" : ""}`,
            `  ${job.description}`,
            `  Scope: ${job.scope}`,
            `  Retry: ${describeRetryPolicy(job.retryPolicy)}`,
          ].join("\n"),
        )
        .join("\n\n")
    : "No data jobs are registered.";
