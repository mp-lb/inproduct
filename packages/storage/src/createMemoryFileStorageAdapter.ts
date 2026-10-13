import { listFiles } from "./listFiles.js";
import { FileStorageError } from "./FileStorageError.js";
import { copyObject } from "./copyObject.js";
import type { FileStorageAdapter, StorageFile } from "./fileTypes.js";
import type { StoredObject } from "./types.js";

/** Ephemeral files with isolated byte and metadata snapshots. Each instance owns its data. */
export const createMemoryFileStorageAdapter = (): FileStorageAdapter => {
  const records = new Map<
    string,
    { file: StorageFile; object: StoredObject }
  >();

  return {
    insert: async (file, object) => {
      if (records.has(file.id)) throw new Error("file already exists");
      records.set(file.id, {
        file: structuredClone(file),
        object: copyObject(object),
      });
    },
    get: async (id) => {
      const record = records.get(id);
      return (
        record && {
          file: structuredClone(record.file),
          object: copyObject(record.object),
        }
      );
    },
    update: async (id, metadata, updatedAt) => {
      const record = records.get(id);
      if (!record) throw new FileStorageError("NOT_FOUND", "file not found");
      record.file = { ...record.file, ...structuredClone(metadata), updatedAt };
      return structuredClone(record.file);
    },
    remove: async (id) => {
      records.delete(id);
    },
    list: async (query) =>
      listFiles([...records.values()].map(({ file }) => file).reverse(), query),
  };
};
