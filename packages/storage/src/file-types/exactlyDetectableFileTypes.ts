import { contentSignatures } from "./contentSignatures.js";
import { officeOpenXmlParts } from "./contentContainers.js";

/** Type ids the built-in detector can positively identify from bytes. */
export const exactlyDetectableFileTypes = new Set([
  ...contentSignatures.flatMap((signature) => signature.types),
  ...officeOpenXmlParts.flatMap((part) => part.types),
  "application/zip",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
  "application/vnd.oasis.opendocument.graphics",
  "application/epub+zip",
  "video/mp4",
  "application/mp4",
  "audio/mp4",
  "video/x-m4v",
  "video/quicktime",
  "video/3gpp",
  "video/3gpp2",
  "image/heic",
  "image/heif",
  "image/avif",
  "image/webp",
  "audio/wav",
  "video/x-msvideo",
  "video/webm",
  "audio/webm",
  "text/plain",
  "text/html",
  "image/svg+xml",
  "application/json",
  "application/xml",
]);
