import type { Db } from "mongodb";
import { createMongoFileMetadataRepository } from "./createMongoFileMetadataRepository.js";
import type {
  FileAudit,
  FilePartition,
  FileRecord,
  FileRepository,
} from "./file-library/fileLibraryContracts.js";

type FileSettings = Pick<
  FilePartition,
  "quotaBytes" | "quotaUpdatedAt" | "quotaUpdatedBy"
>;

/**
 * Transactional file library repository. One document per file lives in the
 * host-chosen collection; revision, quota and the audit outbox live in
 * `${collectionName}Settings`. Requires a MongoDB replica set.
 */
export const createMongoFileLibraryRepository = (
  db: Db,
  collectionName = "files",
): FileRepository =>
  createMongoFileMetadataRepository<FileRecord, FileAudit, FileSettings>(
    db,
    collectionName,
  );
