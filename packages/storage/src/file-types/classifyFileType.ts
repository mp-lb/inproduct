import type { FileTypeCategory } from "./fileTypeCategory.js";

/** Conservative defaults; custom registry definitions can override them. */
export const classifyFileType = (id: string): FileTypeCategory => {
  if (id.startsWith("image/")) return "image";
  if (id.startsWith("video/")) return "video";
  if (id.startsWith("audio/")) return "audio";
  if (
    id.startsWith("text/") ||
    [
      "application/pdf",
      "application/rtf",
      "application/msword",
      "application/postscript",
      "application/epub+zip",
    ].includes(id) ||
    /^application\/vnd\.(?:openxmlformats-officedocument\.|oasis\.opendocument\.|ms-(?:word|excel|powerpoint)(?:\.|$))/.test(
      id,
    )
  )
    return "document";
  return "other";
};
