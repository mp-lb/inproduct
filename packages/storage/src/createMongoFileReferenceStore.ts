import type { Db } from "mongodb";
import type {
  FileReference,
  FileReferenceStore,
} from "./file-library/fileReferences.js";

/**
 * Authoritative association table: one document per reference with its
 * recovery state, so it needs no cross-document transaction. Embedding the
 * reference in another domain document instead requires a host adapter that
 * commits its own outbox atomically. Never dual-write two authoritative references.
 */
export const createMongoFileReferenceStore = (
  db: Db,
  collectionName = "fileStorageReferences",
): FileReferenceStore => {
  if (!collectionName.trim())
    throw new TypeError("collection name is required");
  const rows = db.collection<FileReference & { _id: string }>(collectionName, {
    writeConcern: { w: "majority", j: true },
  });

  return {
    read: async (tenant, id) => {
      const row = await rows.findOne({ _id: JSON.stringify([tenant, id]) });
      if (!row) return null;
      const { _id: _ignored, ...reference } = row;
      return reference;
    },
    save: async (next, previousRevision) => {
      const _id = JSON.stringify([next.actor.tenantId, next.referenceId]);

      if (!previousRevision) {
        try {
          await rows.insertOne({ ...next, _id });
          return true;
        } catch (error) {
          if ((error as { code?: number }).code === 11000) return false;
          throw error;
        }
      }

      return (
        (await rows.replaceOne({ _id, revision: previousRevision }, next))
          .matchedCount === 1
      );
    },
    pending: async (tenantId, limit) =>
      (
        await rows
          .find({ "actor.tenantId": tenantId, delivered: false })
          .sort({ _id: 1 })
          .limit(Math.max(1, Math.min(100, Math.floor(limit) || 1)))
          .toArray()
      ).map(({ _id: _ignored, ...reference }) => reference),
  };
};
