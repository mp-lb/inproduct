import { FileStorageError } from "../FileStorageError.js";
import type {
  Actor,
  FilePartition,
  FileRecord,
} from "./fileLibraryContracts.js";
import { maxPendingAudit } from "./maxPendingAudit.js";

/** Bumps the file revision and appends a durable audit event in the same mutation. */
export const recordFileEvent = (
  clock: { now: () => number; uuid: () => string },
  partition: FilePartition,
  file: FileRecord,
  actor: Actor,
  event: string,
  usage?: { id: string; consumer: string },
) => {
  const at = clock.now();
  file.revision++;
  file.updatedAt = at;
  if (partition.audit.length >= maxPendingAudit)
    throw new FileStorageError(
      "PRECONDITION_FAILED",
      "audit delivery required",
    );
  partition.audit.push({
    id: clock.uuid(),
    eventType: `file.${event}`,
    fileId: file.id,
    actorId: actor.id,
    at,
    timestamp: new Date(at).toISOString(),
    userId: actor.id,
    details: {
      version: 1,
      fileRevision: file.revision,
      scan: file.scan,
      malwarePolicy: file.malwarePolicy ?? "required",
      state: file.state,
      ...(usage ? { usage } : {}),
    },
  });
};
