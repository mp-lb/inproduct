import type { FileView } from "./fileLibraryTypes.js";

/** Browser-native previews only; active document formats such as SVG/HTML are excluded. */
export const canPreviewFile = (file: Pick<FileView, "state" | "type">) =>
  file.state === "available" &&
  file.type.status === "recognized" &&
  [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "image/avif",
  ].includes(file.type.id);
