import { copyObject } from "./copyObject.js";
import type { StorageAdapter, StoredObject } from "./types.js";

/** Isolated, ephemeral storage for tests and local development.
 * Bytes are copied on both writes and reads. No data survives process exit.
 */
export const createMemoryStorageAdapter = (): StorageAdapter => {
  const objects = new Map<string, StoredObject>();
  return {
    put: async (key, object) => {
      objects.set(key, copyObject(object));
    },
    get: async (key) => {
      const object = objects.get(key);
      return object === undefined ? undefined : copyObject(object);
    },
    delete: async (key) => {
      objects.delete(key);
    },
  };
};
