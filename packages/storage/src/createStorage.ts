import type { Storage, StorageOptions } from "./types.js";
import { validateKey } from "./validateKey.js";

/** Create a storage facade with a fixed namespace and optional write-size limit.
 * Keys are literal slash-separated names, never URLs or filesystem paths.
 * Invalid configuration throws synchronously; invalid operations reject.
 */
export const createStorage = (options: StorageOptions): Storage => {
  const { adapter, prefix, maxBytes } = options;
  if (prefix !== undefined) validateKey(prefix);

  if (
    maxBytes !== undefined &&
    (!Number.isSafeInteger(maxBytes) || maxBytes < 0)
  ) {
    throw new RangeError("maxBytes must be a nonnegative safe integer");
  }

  const resolveKey = (key: string): string => {
    validateKey(key);
    return prefix === undefined ? key : `${prefix}/${key}`;
  };

  return {
    put: async (key, object) => {
      const resolved = resolveKey(key);

      if (maxBytes !== undefined && object.body.byteLength > maxBytes) {
        throw new RangeError("object exceeds maxBytes");
      }

      await adapter.put(resolved, object);
    },
    get: async (key) => adapter.get(resolveKey(key)),
    delete: async (key) => adapter.delete(resolveKey(key)),
  };
};
