import { FileStorageError } from "../FileStorageError.js";
import type { FileRepository } from "./fileLibraryContracts.js";
import type { FileAuditLedger } from "./fileAuditLedger.js";

/**
 * Trusted worker: appends pending partition audit events to the ledger, then
 * acknowledges exactly those IDs by partition CAS. Lost acknowledgments are
 * safe to retry. The host chooses tenants, schedules retries and authorizes reads.
 */
export const createFileAuditDispatcher =
  (repository: FileRepository, ledger: FileAuditLedger) =>
  async (tenantId: string) => {
    const snapshot = await repository.read(tenantId);
    if (!snapshot.audit.length) return 0;
    if (snapshot.audit.some((event) => !event.id))
      throw new FileStorageError(
        "PRECONDITION_FAILED",
        "audit identity missing",
      );
    await ledger.append(tenantId, snapshot.audit);
    const delivered = new Set(snapshot.audit.map((event) => event.id));

    for (let attempt = 0; attempt < 12; attempt++) {
      const current = await repository.read(tenantId);

      const remaining = current.audit.filter(
        (event) => !delivered.has(event.id),
      );

      if (remaining.length === current.audit.length)
        return snapshot.audit.length;
      const previous = current.revision;
      current.audit = remaining;
      current.revision++;
      if (await repository.save(current, previous))
        return snapshot.audit.length;
    }

    throw new FileStorageError(
      "CONFLICT",
      "audit acknowledgment changed; retry",
    );
  };
