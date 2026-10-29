import type { FileRecord } from "./fileLibraryContracts.js";
import type { FileTypeRegistry } from "../file-types/fileTypeContracts.js";

export const fileRecordType = (
  file: Pick<FileRecord, "typeId" | "contentType">,
  registry: FileTypeRegistry,
) => registry.get(file.typeId ?? file.contentType ?? "unknown");
