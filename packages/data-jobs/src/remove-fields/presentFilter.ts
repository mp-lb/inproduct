import type { Document, Filter } from "mongodb";

export const presentFilter = (paths: readonly string[]): Filter<Document> => ({
  $or: paths.map((path) => ({ [path]: { $exists: true } })),
});
