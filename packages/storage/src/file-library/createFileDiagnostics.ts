import type { Actor } from "./fileLibraryContracts.js";
import type { FileDiagnostics } from "./fileLibraryTypes.js";
import type { FileLibraryContext } from "./createFileLibraryContext.js";
import { cleanupFinding } from "./cleanupFinding.js";

/** Whole-tenant aggregate metadata. Requires an explicit diagnostics grant. */
export const createFileDiagnostics =
  ({ allow, options, now, maxFiles }: FileLibraryContext) =>
  async (actor: Actor): Promise<FileDiagnostics> => {
    await allow(actor, "diagnostics");
    const partition = await options.repository.read(actor.tenantId);
    const asOf = now();

    const result: FileDiagnostics = {
      asOf,
      count: partition.files.length,
      reservedBytes: 0,
      verifiedBytes: 0,
      quotaBytes: partition.quotaBytes ?? options.quotaBytes,
      maxFiles,
      physicalBytes: null,
      lastPrune: null,
      mode: "report-only",
      candidates: [],
      blocked: [],
    };

    for (const file of partition.files) {
      if (file.state === "available") result.verifiedBytes += file.sizeBytes;
      else result.reservedBytes += file.sizeBytes;

      const finding = cleanupFinding(file, asOf);
      if (finding?.kind === "candidate")
        result.candidates.push({ fileId: file.id, reason: finding.reason });
      else if (finding)
        result.blocked.push({ fileId: file.id, reason: finding.reason });
    }

    return result;
  };
