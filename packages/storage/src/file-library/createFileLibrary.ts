import { createFileLinks } from "./createFileLinks.js";
import type { Actor, FileLibraryOptions } from "./fileLibraryContracts.js";
import { createFileLibraryContext } from "./createFileLibraryContext.js";
import { createBeginFileUpload } from "./createBeginFileUpload.js";
import { createFinalizeFileUpload } from "./createFinalizeFileUpload.js";
import { createFileUsage } from "./createFileUsage.js";
import { createSetFileQuota } from "./createSetFileQuota.js";
import { createListFiles } from "./createListFiles.js";
import { createEditFile } from "./createEditFile.js";
import { createRemoveFile } from "./createRemoveFile.js";
import { createDownloadFile } from "./createDownloadFile.js";
import { createFileDiagnostics } from "./createFileDiagnostics.js";

/**
 * Managed file library: object keys, version pins, upload capabilities,
 * verification, quotas and retention holds hidden behind file UUIDs.
 * The host supplies trusted actors, authorization, persistence and providers.
 */
export const createFileLibrary = (options: FileLibraryOptions) => {
  const context = createFileLibraryContext(options);
  const usage = createFileUsage(context);
  return {
    ...createFileLinks(context),
    begin: createBeginFileUpload(context),
    finalize: createFinalizeFileUpload(context),
    setQuota: createSetFileQuota(context),
    reserve: (actor: Actor, id: string, hold: string, consumer: string) =>
      usage(actor, id, hold, consumer, "reserved"),
    attach: (actor: Actor, id: string, hold: string, consumer: string) =>
      usage(actor, id, hold, consumer, "attached"),
    release: (actor: Actor, id: string, hold: string, consumer: string) =>
      usage(actor, id, hold, consumer, "released"),
    list: createListFiles(context),
    edit: createEditFile(context),
    remove: createRemoveFile(context),
    download: createDownloadFile(context),
    preview: createDownloadFile(context, true),
    diagnostics: createFileDiagnostics(context),
  };
};

export type FileLibrary = ReturnType<typeof createFileLibrary>;
