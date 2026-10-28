import type { Actor } from "./fileLibraryContracts.js";

/** One immutable association identity, not an application entity schema.
 * Replacements use a new referenceId; released references are permanent tombstones. */
export type FileReference = {
  referenceId: string;
  actor: Actor;
  fileId: string;
  consumer: string;
  revision: number;
  state: "intent" | "bound" | "detaching" | "released";
  delivered: boolean;
};

/** Authoritative association store. `save` is a revision compare-and-swap;
 * revision 0 means insert-if-absent. `pending` returns undelivered rows. */
export type FileReferenceStore = {
  read(tenantId: string, referenceId: string): Promise<FileReference | null>;
  save(next: FileReference, previousRevision: number): Promise<boolean>;
  pending(tenantId: string, limit: number): Promise<FileReference[]>;
};
