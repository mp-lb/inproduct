import type { DataJobOutcome, DataJobRunContext } from "../dataJobTypes.js";
import { removableFilter } from "./removableFilter.js";
import type { RemoveFieldsTarget } from "./removeFieldsTarget.js";
import { unsetBatch } from "./unsetBatch.js";
import { withinScope } from "./withinScope.js";

/** Removes fields in batches, re-querying each time so already-removed fields are skipped. */
export const runRemoveFields = async (
  target: RemoveFieldsTarget,
  batchSize: number,
  { reportProgress }: DataJobRunContext,
): Promise<DataJobOutcome> => {
  const { collection, fields, filter } = target;
  const pending = withinScope(filter, { $or: fields.map(removableFilter) });

  const [scopeCount, total] = await Promise.all([
    collection.countDocuments(filter ?? {}),
    collection.countDocuments(pending),
  ]);

  const removed = new Map(fields.map((field) => [field, 0]));
  let changedCount = 0;
  reportProgress({ completed: 0, total });

  for (;;) {
    const ids = (
      await collection
        .find(pending, { projection: { _id: 1 } })
        .limit(batchSize)
        .toArray()
    ).map((document) => document._id);

    if (!ids.length) break;
    const modified = await unsetBatch(target, ids, removed);
    // A batch that changes nothing would loop forever, e.g. under a concurrent writer.
    if (!modified)
      throw new Error(
        "Fields reappeared while removing them; stopped to avoid looping.",
      );
    changedCount += ids.length;
    reportProgress({
      completed: changedCount,
      total: Math.max(total, changedCount),
    });
  }

  return {
    summary: changedCount
      ? `Removed fields from ${changedCount} documents.`
      : "Fields were already removed. Nothing changed.",
    changedCount,
    skippedCount: Math.max(0, scopeCount - changedCount),
    changes: fields.map((field) => ({
      label: `Removed ${field}`,
      count: removed.get(field) ?? 0,
    })),
  };
};
