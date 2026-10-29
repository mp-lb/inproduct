import { createHash } from "node:crypto";
import { maxLibraryFileBytes } from "./fileLibrarySchemas.js";
import type {
  ContentCheck,
  FileTypeRegistry,
  FileTypeStatus,
} from "../file-types/fileTypeContracts.js";
import { defaultFileTypeRegistry } from "../file-types/defaultFileTypeRegistry.js";
import { detectFileContent } from "../file-types/detectFileContent.js";
import { matchFileContent } from "../file-types/matchFileContent.js";

/**
 * Checks size and SHA-256 of exact object bytes, then matches content against the
 * claimed type under `contentCheck`. `exact` needs a positive identification;
 * `compatible` also accepts a matching container or text family; `unchecked`
 * skips matching. Upload MIME is never trusted, and a pass is not a safety verdict.
 */
export const inspectFileBytes = (
  bytes: Uint8Array,
  checksum: string,
  contentType: string,
  contentCheck: ContentCheck = "exact",
  registry: FileTypeRegistry = defaultFileTypeRegistry(),
): { valid: boolean; typeStatus: FileTypeStatus } => {
  const invalid = { valid: false, typeStatus: "inferred" as const };
  if (
    bytes.length === 0 ||
    bytes.length > maxLibraryFileBytes ||
    createHash("sha256").update(bytes).digest("hex") !== checksum
  )
    return invalid;

  if (contentCheck === "unchecked")
    return { valid: true, typeStatus: "inferred" };
  const type = registry.get(contentType);
  if (!type) return invalid;
  const match = matchFileContent(detectFileContent(bytes), type);
  if (match === "exact") return { valid: true, typeStatus: "recognized" };
  return match === "compatible" && contentCheck === "compatible"
    ? { valid: true, typeStatus: "compatible" }
    : invalid;
};
