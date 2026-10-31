import { z } from "zod";
import { dataJobMetadataSchema } from "./dataJobSchemas.js";
import type { DataJob } from "./dataJobTypes.js";

/** Validates an application-defined job. This is the extension point for custom jobs.
 * @throws TypeError when metadata is missing or malformed.
 */
export const defineDataJob = (job: DataJob): DataJob => {
  const metadata = dataJobMetadataSchema.safeParse(job);
  if (!metadata.success)
    throw new TypeError(
      `invalid data job ${String(job.id)}: ${z.prettifyError(metadata.error)}`,
    );
  for (const operation of ["inspect", "run", "verify"] as const)
    if (typeof job[operation] !== "function")
      throw new TypeError(`data job ${job.id} must define ${operation}`);
  return { ...job, ...metadata.data };
};
