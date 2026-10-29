import { FileStorageError } from "./FileStorageError.js";
import { createMemoryFileStorageAdapter } from "./createMemoryFileStorageAdapter.js";
import { normalizeFileMetadata } from "./normalizeFileMetadata.js";
import type { FileStorageClient, FileStorageOptions } from "./fileTypes.js";

/** Ready-to-use file operations. The default memory adapter is for local demos and tests.
 * Supply a durable adapter on your server; expose the client through your authorized transport.
 * Content types are caller-supplied. This does not scan or verify uploaded content.
 */
export const createFileStorage = (
  options: FileStorageOptions = {},
): FileStorageClient => {
  const {
    adapter = createMemoryFileStorageAdapter(),
    maxBytes = 10 * 1024 * 1024,
  } = options;

  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0)
    throw new RangeError("maxBytes must be a nonnegative safe integer");
  return {
    list: async (query = {}) => {
      const {
        offset = 0,
        limit = 25,
        search = "",

        tag = "",
      } = query;

      if (
        !Number.isSafeInteger(offset) ||
        offset < 0 ||
        !Number.isSafeInteger(limit) ||
        limit < 1 ||
        limit > 100
      )
        throw new FileStorageError(
          "INVALID_INPUT",
          "Use a nonnegative offset and a page size from 1 to 100.",
        );
      return adapter.list({
        offset,
        limit,
        search: search.trim(),

        tag: tag.trim(),
      });
    },
    upload: async (input) => {
      if (input.body.byteLength > maxBytes)
        throw new FileStorageError(
          "TOO_LARGE",
          `File exceeds the ${maxBytes.toLocaleString()} byte limit.`,
        );

      const metadata = normalizeFileMetadata({
        name: input.name,

        tags: input.tags ?? [],
      });

      const now = new Date().toISOString();

      const file = {
        ...metadata,
        id: crypto.randomUUID(),
        sizeBytes: input.body.byteLength,
        contentType: input.contentType || "application/octet-stream",
        createdAt: now,
        updatedAt: now,
      };

      await adapter.insert(file, {
        body: input.body,
        contentType: file.contentType,
      });

      return file;
    },
    edit: async (id, metadata) =>
      adapter.update(
        id,
        normalizeFileMetadata(metadata),
        new Date().toISOString(),
      ),
    remove: async (id) => adapter.remove(id),
    download: async (id) => {
      const record = await adapter.get(id);
      if (!record) throw new FileStorageError("NOT_FOUND", "file not found");
      return { ...record.object, name: record.file.name };
    },
  };
};
