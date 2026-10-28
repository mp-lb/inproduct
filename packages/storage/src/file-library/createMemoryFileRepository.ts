import type { FilePartition, FileRepository } from "./fileLibraryContracts.js";
import { emptyFilePartition } from "./emptyFilePartition.js";

/** In-process CAS repository for tests and local demos. Not durable. */
export const createMemoryFileRepository = (): FileRepository => {
  const partitions = new Map<string, FilePartition>();
  return {
    read: async (id) =>
      structuredClone(partitions.get(id) ?? emptyFilePartition(id)),
    save: async (next, previous) => {
      if ((partitions.get(next._id)?.revision ?? 0) !== previous) return false;
      partitions.set(next._id, structuredClone(next));
      return true;
    },
  };
};
