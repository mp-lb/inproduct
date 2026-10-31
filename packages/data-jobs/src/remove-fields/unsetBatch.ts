import type { Document } from "mongodb";
import { removableFilter } from "./removableFilter.js";
import type { RemoveFieldsTarget } from "./removeFieldsTarget.js";
import { withinScope } from "./withinScope.js";

/** Unsets each field separately so a blocked path in one document never affects another field. */
export const unsetBatch = async (
  { collection, fields, filter }: RemoveFieldsTarget,
  ids: Document["_id"][],
  removed: Map<string, number>,
) => {
  let modified = 0;

  for (const field of fields) {
    const result = await collection.updateMany(
      withinScope(filter, { _id: { $in: ids }, ...removableFilter(field) }),
      { $unset: { [field]: "" } },
    );

    removed.set(field, (removed.get(field) ?? 0) + result.modifiedCount);
    modified += result.modifiedCount;
  }

  return modified;
};
