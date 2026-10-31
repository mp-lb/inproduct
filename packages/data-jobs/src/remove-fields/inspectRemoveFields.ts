import type { DataJobInspection } from "../dataJobTypes.js";
import { blockedFilter } from "./blockedFilter.js";
import { removableFilter } from "./removableFilter.js";
import type { RemoveFieldsTarget } from "./removeFieldsTarget.js";
import { withinScope } from "./withinScope.js";

const countBlocked = (target: RemoveFieldsTarget, field: string) => {
  const blocked = blockedFilter(field);
  return blocked
    ? target.collection.countDocuments(withinScope(target.filter, blocked))
    : Promise.resolve(0);
};

export const inspectRemoveFields = async (
  target: RemoveFieldsTarget,
): Promise<DataJobInspection> => {
  const { collection, fields, filter } = target;

  const counts = await Promise.all(
    fields.map(async (field) => ({
      field,
      removable: await collection.countDocuments(
        withinScope(filter, removableFilter(field)),
      ),
      blocked: await countBlocked(target, field),
    })),
  );

  const matchedCount = await collection.countDocuments(
    withinScope(filter, { $or: fields.map(removableFilter) }),
  );

  return {
    summary: matchedCount
      ? `Removes ${fields.join(", ")} from ${matchedCount} documents.`
      : "No document in scope contains these fields. Nothing to remove.",
    matchedCount,
    changes: counts.map(({ field, removable }) => ({
      label: `Remove ${field}`,
      count: removable,
    })),
    warnings: counts
      .filter(({ blocked }) => blocked > 0)
      .map(
        ({ field, blocked }) =>
          `${blocked} documents reach ${field} through an array. Remove fields does not change array elements; handle them manually.`,
      ),
  };
};
