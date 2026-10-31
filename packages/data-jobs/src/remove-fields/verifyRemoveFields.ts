import type { DataJobVerification } from "../dataJobTypes.js";
import { presentFilter } from "./presentFilter.js";
import type { RemoveFieldsTarget } from "./removeFieldsTarget.js";
import { withinScope } from "./withinScope.js";

/** Counts every remaining occurrence, including fields inside arrays that were not removed. */
export const verifyRemoveFields = async ({
  collection,
  fields,
  filter,
}: RemoveFieldsTarget): Promise<DataJobVerification> => {
  const remainingCount = await collection.countDocuments(
    withinScope(filter, presentFilter(fields)),
  );

  return {
    passed: remainingCount === 0,
    remainingCount,
    summary: remainingCount
      ? `${remainingCount} documents in scope still contain ${fields.join(", ")}.`
      : `No document in scope contains ${fields.join(", ")}.`,
  };
};
