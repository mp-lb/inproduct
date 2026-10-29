import type { FileRecord } from "./fileLibraryContracts.js";
import type { FileView } from "./fileLibraryTypes.js";
import type { FileTypeRegistry } from "../file-types/fileTypeContracts.js";
import { downloadFileName } from "../file-types/downloadFileName.js";
import { fallbackFileTypeLabel } from "../file-types/fallbackFileTypeLabel.js";
import { fileRecordName } from "./fileRecordName.js";

export const fileView = (row: FileRecord, registry: FileTypeRegistry): FileView => {
  const { name, extension } = fileRecordName(row, registry);
  const type = registry.get(row.contentType);

  return {
    id: row.id,
    name,
    extension,
    fileName: downloadFileName(name, extension),
    scope: row.scope,
    category: row.category,
    tags: row.tags,
    ownerId: row.ownerId,
    sizeBytes: row.sizeBytes,
    contentType: type?.id ?? row.contentType,
    type: {
      id: type?.id ?? row.contentType,
      label: type?.label ?? fallbackFileTypeLabel(row.contentType, []),
      status: row.typeStatus ?? "inferred",
    },
    state: row.state,
    revision: row.revision,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    scan: row.scan,
    holdCount: row.holds.filter((hold) => hold.state !== "released").length,
  };
};
