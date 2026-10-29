import type {
  FileType,
  FileTypeStatus,
} from "../file-types/fileTypeContracts.js";

export const isPreviewableType = (
  type: FileType | undefined,
  status?: FileTypeStatus,
) =>
  status === "recognized" &&
  !!type &&
  !type.active &&
  [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "image/avif",
  ].includes(type.mediaType);
