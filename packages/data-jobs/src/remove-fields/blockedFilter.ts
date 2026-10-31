import type { Document, Filter } from "mongodb";
import { parentPaths } from "./parentPaths.js";

/** Documents where the field is only reachable through an array; undefined for top-level paths. */
export const blockedFilter = (path: string): Filter<Document> | undefined => {
  const parents = parentPaths(path);
  if (!parents.length) return undefined;
  return {
    [path]: { $exists: true },
    $or: parents.map((parent) => ({ [parent]: { $type: "array" } })),
  };
};
