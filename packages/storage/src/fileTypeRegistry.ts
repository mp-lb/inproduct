export { createFileTypeRegistry } from "./file-types/createFileTypeRegistry.js";
export { defaultFileTypeRegistry } from "./file-types/defaultFileTypeRegistry.js";
export { identifyFileType } from "./file-types/identifyFileType.js";
export { detectFileContent } from "./file-types/detectFileContent.js";
export { matchFileContent } from "./file-types/matchFileContent.js";
export { canCheckContent } from "./file-types/canCheckContent.js";
export { normalizeMediaType } from "./file-types/normalizeMediaType.js";
export { findFileExtension } from "./file-types/findFileExtension.js";
export { deriveFileName } from "./file-types/deriveFileName.js";
export { stripTypeExtension } from "./file-types/stripTypeExtension.js";
export { sanitizeFileName } from "./file-types/sanitizeFileName.js";
export { downloadFileName } from "./file-types/downloadFileName.js";
export { contentDisposition } from "./file-types/contentDisposition.js";
export { describeFileDownload } from "./file-types/describeFileDownload.js";
export { fileTypeAccept } from "./file-types/fileTypeAccept.js";
export { fileTypePresets } from "./file-types/fileTypePresets.js";
export type {
  ContentCheck,
  ContentDetection,
  ContentMatch,
  ExtensionLookup,
  FileType,
  FileTypeConflict,
  FileTypeIdentification,
  FileTypeInput,
  FileTypeRegistry,
  FileTypeRegistryOptions,
  FileTypeSource,
  FileTypeStatus,
} from "./file-types/fileTypeContracts.js";

export {
  fileTypeCategorySchema,
  type FileTypeCategory,
} from "./file-types/fileTypeCategory.js";
