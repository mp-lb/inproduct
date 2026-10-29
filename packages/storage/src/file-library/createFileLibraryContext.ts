import type { FileLinkTarget } from "./fileLinks.js";
import { randomUUID } from "node:crypto";
import { FileStorageError } from "../FileStorageError.js";
import type {
  Action,
  Actor,
  FileLibraryOptions,
  FilePartition,
  FileRecord,
} from "./fileLibraryContracts.js";
import { fileView } from "./fileView.js";
import { recordFileEvent } from "./recordFileEvent.js";
import { isAcceptedFile } from "./isAcceptedFile.js";
import { assertVerifiedProvider } from "./assertVerifiedProvider.js";
import { resolveFileTypePolicy } from "./resolveFileTypePolicy.js";

const maxMutationAttempts = 12;

/** Validated options plus the shared authorization and CAS primitives. */
export const createFileLibraryContext = (options: FileLibraryOptions) => {
  for (const limit of Object.values(options.maxLinksPerType ?? {}))
    if (!Number.isSafeInteger(limit) || limit < 1)
      throw new TypeError("invalid file link limit");
  const now = options.now ?? Date.now;
  const uuid = options.uuid ?? randomUUID;
  const timeoutMs = options.operationTimeoutMs ?? 15_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000)
    throw new Error("invalid storage timeout");
  const maxFiles = Math.min(options.maxFiles ?? 500, 500);
  if (
    !Number.isSafeInteger(options.quotaBytes) ||
    options.quotaBytes <= 0 ||
    !Number.isInteger(maxFiles) ||
    maxFiles < 1
  )
    throw new Error("invalid storage limits");
  const types = resolveFileTypePolicy(options.fileTypes);
  const view = (file: FileRecord) => fileView(file, types.registry);

  const allow = async (
    actor: Actor,
    action: Action,
    file?: FileRecord,
    extra?: {
      consumer?: string;
      link?: FileLinkTarget;
    },
  ) => {
    if (
      !actor.id ||
      actor.id.length > 200 ||
      !actor.tenantId ||
      actor.tenantId.length > 200 ||
      (file && file.tenantId !== actor.tenantId) ||
      !(await options.authorize({
        actor,
        action,
        file: file && view(file),
        ...extra,
      }))
    )
      throw new FileStorageError("FORBIDDEN", "file access denied");
  };

  // Changes run against a fresh snapshot and must not perform remote work.
  const mutate = async <T>(
    actor: Actor,
    change: (partition: FilePartition) => T,
  ): Promise<T> => {
    for (let attempt = 0; attempt < maxMutationAttempts; attempt++) {
      const partition = await options.repository.read(actor.tenantId);
      const previous = partition.revision;
      const result = change(partition);
      partition.revision++;
      if (await options.repository.save(partition, previous)) return result;
    }

    throw new FileStorageError("CONFLICT", "files changed; retry");
  };

  const find = (partition: FilePartition, id: string) => {
    const file = partition.files.find((entry) => entry.id === id);
    if (!file) throw new FileStorageError("NOT_FOUND", "file not found");
    return file;
  };

  const read = async (actor: Actor, id: string, action: Action) => {
    const file = find(await options.repository.read(actor.tenantId), id);
    await allow(actor, action, file);
    return file;
  };

  const touch = (
    partition: FilePartition,
    file: FileRecord,
    actor: Actor,
    event: string,
    usage?: { id: string; consumer: string },
  ) => recordFileEvent({ now, uuid }, partition, file, actor, event, usage);

  return {
    options,
    now,
    uuid,
    timeoutMs,
    maxFiles,
    allow,
    mutate,
    find,
    read,
    touch,
    types,
    view,
    checkProvider: () => assertVerifiedProvider(options),
    isAccepted: (file: FileRecord) => isAcceptedFile(options, file),
  };
};

export type FileLibraryContext = ReturnType<typeof createFileLibraryContext>;
