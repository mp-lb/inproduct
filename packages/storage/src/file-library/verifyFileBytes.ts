import type {
  ContentCheck,
  FileTypeRegistry,
} from "../file-types/fileTypeContracts.js";
import { inspectFileBytes } from "./inspectFileBytes.js";

/** Checks size, SHA-256 and detected content type of exact object bytes. */
export const verifyFileBytes = (
  bytes: Uint8Array,
  checksum: string,
  contentType: string,
  contentCheck: ContentCheck = "exact",
  registry?: FileTypeRegistry,
) =>
  inspectFileBytes(bytes, checksum, contentType, contentCheck, registry).valid;
