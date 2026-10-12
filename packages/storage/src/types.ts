export type StoredObject = {
  body: Uint8Array;
  contentType?: string;
};

/** Adapters own persistence. Put replaces an existing object; delete is idempotent.
 * Get returns undefined only when the key is absent. Operational errors reject.
 * Implementations must isolate stored bytes from caller mutations.
 */
export type StorageAdapter = {
  put: (key: string, object: StoredObject) => Promise<void>;
  get: (key: string) => Promise<StoredObject | undefined>;
  delete: (key: string) => Promise<void>;
};

export type StorageOptions = {
  adapter: StorageAdapter;
  /** Optional slash-separated namespace; this is not an authorization boundary. */
  prefix?: string;
  /** Maximum bytes per write. Defaults to no limit; zero permits empty objects only. */
  maxBytes?: number;
};

export type Storage = StorageAdapter;
