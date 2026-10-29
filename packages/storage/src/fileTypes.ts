import type { StoredObject } from "./types.js";

export type FileMetadata = {
  name: string;

  tags: string[];
};
export type StorageFile = FileMetadata & {
  id: string;
  sizeBytes: number;
  contentType: string;
  createdAt: string;
  updatedAt: string;
};
export type FileUpload = StoredObject & {
  name: string;

  tags?: string[];
};
export type FileQuery = {
  search?: string;

  tag?: string;
  offset?: number;
  limit?: number;
};
export type FilePage = {
  items: StorageFile[];
  total: number;
  nextOffset: number | null;
  usage: { count: number; bytes: number };
};
/** A transport-independent client. Remote implementations must authorize every operation. */
export type FileStorageClient = {
  list: (query?: FileQuery) => Promise<FilePage>;
  upload: (input: FileUpload) => Promise<StorageFile>;
  edit: (id: string, metadata: FileMetadata) => Promise<StorageFile>;
  remove: (id: string) => Promise<void>;
  download: (id: string) => Promise<StoredObject & { name: string }>;
};
/** Adapters persist bytes and metadata together. Reads must return independent snapshots.
 * Updates reject missing IDs and must never resurrect deleted files.
 * List returns metadata only, in stable newest-first order, with unfiltered usage totals.
 */
export type FileStorageAdapter = {
  list: (query: Required<FileQuery>) => Promise<FilePage>;
  insert: (file: StorageFile, object: StoredObject) => Promise<void>;
  get: (
    id: string,
  ) => Promise<{ file: StorageFile; object: StoredObject } | undefined>;
  update: (
    id: string,
    metadata: FileMetadata,
    updatedAt: string,
  ) => Promise<StorageFile>;
  remove: (id: string) => Promise<void>;
};
export type FileStorageOptions = {
  /** Omit for isolated, ephemeral memory storage intended for local demos. */
  adapter?: FileStorageAdapter;
  /** Defaults to 10 MiB per file. */
  maxBytes?: number;
};
