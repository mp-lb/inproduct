import type { Db } from "mongodb";
import type { FileAudit } from "./file-library/fileLibraryContracts.js";
import type { FileAuditLedger } from "./file-library/fileAuditLedger.js";

/** Idempotent append-only ledger keyed by tenant + event ID. Application-level
 * append-only behavior, not database-enforced WORM storage. */
export const createMongoFileAuditLedger = (
  db: Db,
  collectionName = "fileStorageAudit",
): FileAuditLedger => {
  if (!collectionName.trim())
    throw new TypeError("collection name is required");
  const events = db.collection<FileAudit & { _id: string; tenantId: string }>(
    collectionName,
    { writeConcern: { w: "majority", j: true } },
  );

  return {
    append: async (tenantId, batch) => {
      for (const event of batch) {
        const _id = JSON.stringify([tenantId, event.id]);
        await events.updateOne(
          { _id },
          { $setOnInsert: { ...event, _id, tenantId } },
          { upsert: true },
        );
      }
    },
  };
};
