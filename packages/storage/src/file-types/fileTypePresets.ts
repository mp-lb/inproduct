import { libraryContentTypes } from "../file-library/fileLibrarySchemas.js";

/** Ready-made accept lists. `library` is the managed file library's default. */
export const fileTypePresets = {
  library: libraryContentTypes,
  images: ["image/png", "image/jpeg", "image/gif", "image/webp"],
  documents: [
    "application/pdf",
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/rtf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.oasis.opendocument.text",
    "application/vnd.oasis.opendocument.spreadsheet",
    "application/vnd.oasis.opendocument.presentation",
  ],
} as const;
