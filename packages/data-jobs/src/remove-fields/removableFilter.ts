import type { Document, Filter } from "mongodb";
import { parentPaths } from "./parentPaths.js";

// MongoDB queries traverse arrays implicitly, but `$unset` with a plain dotted path does
// not change array elements. Documents reaching a field through an array are excluded
// here and reported by blockedFilter instead of being silently left behind.
export const removableFilter = (path: string): Filter<Document> => ({
  [path]: { $exists: true },
  ...Object.fromEntries(
    parentPaths(path).map((parent) => [parent, { $not: { $type: "array" } }]),
  ),
});
