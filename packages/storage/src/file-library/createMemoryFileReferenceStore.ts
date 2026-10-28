import type { FileReference, FileReferenceStore } from "./fileReferences.js";

/** In-process reference store for tests and local demos. Not durable. */
export const createMemoryFileReferenceStore = (): FileReferenceStore => {
  const rows = new Map<string, FileReference>();
  const key = (tenantId: string, id: string) => JSON.stringify([tenantId, id]);
  return {
    read: async (tenantId, id) =>
      structuredClone(rows.get(key(tenantId, id)) ?? null),
    save: async (next, previousRevision) => {
      const id = key(next.actor.tenantId, next.referenceId);
      if ((rows.get(id)?.revision ?? 0) !== previousRevision) return false;
      rows.set(id, structuredClone(next));
      return true;
    },
    pending: async (tenantId, limit) =>
      [...rows.entries()]
        .filter(([, row]) => row.actor.tenantId === tenantId && !row.delivered)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(0, Math.max(1, Math.min(100, Math.floor(limit) || 1)))
        .map(([, row]) => structuredClone(row)),
  };
};
