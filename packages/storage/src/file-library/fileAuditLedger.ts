import type { FileAudit } from "./fileLibraryContracts.js";

/** Durable audit sink. Append must be idempotent by tenant + event ID. */
export type FileAuditLedger = {
  append(tenantId: string, events: FileAudit[]): Promise<void>;
};
