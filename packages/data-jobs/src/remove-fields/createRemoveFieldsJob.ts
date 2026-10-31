import type { Collection, Document, Filter } from "mongodb";
import { defineDataJob } from "../defineDataJob.js";
import type { DataJob } from "../dataJobTypes.js";
import { assertFieldPaths } from "./assertFieldPaths.js";
import { inspectRemoveFields } from "./inspectRemoveFields.js";
import { runRemoveFields } from "./runRemoveFields.js";
import { verifyRemoveFields } from "./verifyRemoveFields.js";

export type RemoveFieldsJobOptions = {
  id: string;
  title: string;
  description: string;
  collection: Collection<Document>;
  /** Dot-separated object paths, such as `legacyPrice` or `internal.notes`. */
  fields: readonly string[];
  /** Restricts the job to matching documents. Defined in host code, never by callers. */
  filter?: Filter<Document>;
  /** Operator-facing scope description. Defaults to the namespace. */
  scope?: string;
  batchSize?: number;
};

/** Built-in job that removes fields from documents in one collection.
 * Documents are read as raw BSON, so legacy shapes need not match application schemas.
 * @throws TypeError for unsupported field paths or batch sizes.
 */
export const createRemoveFieldsJob = ({
  collection,
  fields,
  filter,
  scope,
  batchSize = 500,
  ...metadata
}: RemoveFieldsJobOptions): DataJob => {
  assertFieldPaths(fields);
  if (!Number.isSafeInteger(batchSize) || batchSize < 1)
    throw new TypeError("batch size must be a positive integer");
  const target = { collection, fields: [...fields], filter };
  const namespace = `${collection.dbName}.${collection.collectionName}`;

  return defineDataJob({
    ...metadata,
    scope:
      scope ??
      (filter
        ? `Filtered documents in ${namespace}`
        : `All documents in ${namespace}`),
    destructive: true,
    retryPolicy: "safe_to_rerun",
    inspect: () => inspectRemoveFields(target),
    run: (context) => runRemoveFields(target, batchSize, context),
    verify: () => verifyRemoveFields(target),
  });
};
