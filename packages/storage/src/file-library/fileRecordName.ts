import { fileRecordType } from "./fileRecordType.js";
import type { FileRecord } from "./fileLibraryContracts.js";
import type { FileTypeRegistry } from "../file-types/fileTypeContracts.js";
import { deriveFileName } from "../file-types/deriveFileName.js";

/** The record's name and extension. Legacy records (no `extension` key) stored the
 * full uploaded file name; it is split against the stored type on read. */
export const fileRecordName = (
  row: Pick<FileRecord, "name" | "extension" | "contentType" | "typeId">,
  registry: FileTypeRegistry,
) => {
  if (row.extension !== undefined)
    return { name: row.name, extension: row.extension };
  const type = fileRecordType(row, registry);
  return type
    ? deriveFileName(row.name, type, registry)
    : { name: row.name, extension: null };
};
