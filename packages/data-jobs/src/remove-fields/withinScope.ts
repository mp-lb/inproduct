import type { Document, Filter } from "mongodb";

export const withinScope = (
  scope: Filter<Document> | undefined,
  filter: Filter<Document>,
): Filter<Document> => (scope ? { $and: [scope, filter] } : filter);
