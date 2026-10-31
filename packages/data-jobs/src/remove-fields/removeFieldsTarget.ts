import type { Collection, Document, Filter } from "mongodb";

export type RemoveFieldsTarget = {
  collection: Collection<Document>;
  fields: readonly string[];
  filter?: Filter<Document>;
};
