import { createHash } from "node:crypto";
import { maxLibraryFileBytes } from "./fileLibrarySchemas.js";
import { matchesContentType } from "./matchesContentType.js";

/** Checks size, SHA-256 and detected content type of exact object bytes. */
export const verifyFileBytes = (
  bytes: Buffer,
  checksum: string,
  contentType: string,
) =>
  bytes.length > 0 &&
  bytes.length <= maxLibraryFileBytes &&
  createHash("sha256").update(bytes).digest("hex") === checksum &&
  matchesContentType(bytes, contentType);
