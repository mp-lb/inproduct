import { fileRecordType } from "./fileRecordType.js";
import type { FileRecord } from "./fileLibraryContracts.js";
import type { FileView } from "./fileLibraryTypes.js";
import type { FileTypeRegistry } from "../file-types/fileTypeContracts.js";
import { downloadFileName } from "../file-types/downloadFileName.js";
import { isPreviewableType } from "./isPreviewableType.js";
import { fileRecordName } from "./fileRecordName.js";

export const fileView = (
  row: FileRecord,
  registry: FileTypeRegistry,
): FileView => {
  const { name, extension } = fileRecordName(row, registry);
  const type = fileRecordType(row, registry);

  return {
    id: row.id,
    name,
    extension,
    fileName: downloadFileName(name, extension),

    tags: row.tags,
    ownerId: row.ownerId,
    sizeBytes: row.sizeBytes,
    previewable:
      row.state === "available" && isPreviewableType(type, row.typeStatus),
    type: {
      category: type?.category ?? "other",
      id: type?.id ?? "unknown",
      label: !type || type.id === "unknown" ? "Unknown file type" : type.label,
    },
    state: row.state,
    revision: row.revision,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    scan: row.scan,
    holdCount: row.holds.filter((hold) => hold.state !== "released").length,
  };
};
