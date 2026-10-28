import type { FileRecord } from "./fileLibraryContracts.js";
import type { FileView } from "./fileLibraryTypes.js";

export const fileView = (row: FileRecord): FileView => ({
  id: row.id,
  name: row.name,
  scope: row.scope,
  category: row.category,
  tags: row.tags,
  ownerId: row.ownerId,
  sizeBytes: row.sizeBytes,
  contentType: row.contentType,
  state: row.state,
  revision: row.revision,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  scan: row.scan,
  holdCount: row.holds.filter((hold) => hold.state !== "released").length,
});
