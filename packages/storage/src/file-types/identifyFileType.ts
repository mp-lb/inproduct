import type {
  FileType,
  FileTypeConflict,
  FileTypeIdentification,
  FileTypeRegistry,
} from "./fileTypeContracts.js";
import { detectFileContent } from "./detectFileContent.js";
import { findFileExtension } from "./findFileExtension.js";
import { matchFileContent } from "./matchFileContent.js";
import { normalizeMediaType } from "./normalizeMediaType.js";

const uninformative = new Set([
  "application/octet-stream",
  "binary/octet-stream",
]);

/**
 * Weighs a file name, a client-reported type and optionally bytes. Bytes that
 * identify or fit a claimed type give `recognized` or `compatible`; claims alone
 * give `inferred`; disagreement gives `conflict`. Content recognition is evidence
 * about format, never proof of validity or safety.
 */
export const identifyFileType = (
  input: { fileName?: string; declaredType?: string; bytes?: Uint8Array },
  registry: FileTypeRegistry,
): FileTypeIdentification => {
  const found = input.fileName
    ? findFileExtension(input.fileName, registry)
    : null;

  const extensionTypes = found?.registered
    ? registry.byExtension(found.extension).types
    : [];

  const normalized = input.declaredType
    ? normalizeMediaType(input.declaredType)
    : null;

  const declared =
    normalized && !uninformative.has(normalized)
      ? registry.get(normalized)
      : undefined;

  const conflicts: FileTypeConflict[] = [];

  if (declared && extensionTypes.length && !extensionTypes.includes(declared))
    conflicts.push("extension-declared");

  const claims = [
    ...new Set([...(declared ? [declared] : []), ...extensionTypes]),
  ];

  const detection = input.bytes ? detectFileContent(input.bytes) : null;

  const matches = detection
    ? claims.map((type) => ({ type, match: matchFileContent(detection, type) }))
    : [];

  const best =
    matches.find((entry) => entry.match === "exact") ??
    matches.find((entry) => entry.match === "compatible");

  const evidence = {
    extension: found?.registered
      ? {
          value: found.extension,
          types: extensionTypes.map((type) => type.id),
        }
      : null,
    declared: input.declaredType
      ? { value: input.declaredType, type: declared?.id ?? null }
      : null,
    content: detection ? { ...detection, match: best?.match ?? null } : null,
  };

  const result = (
    status: FileTypeIdentification["status"],
    type: FileType | null,
    candidates: FileType[],
  ): FileTypeIdentification => ({
    status,
    type,
    candidates,
    evidence,
    conflicts,
  });

  if (detection && (detection.types.length || detection.container)) {
    const fits = (type: FileType) =>
      matches.some(
        (entry) => entry.type === type && entry.match !== "mismatch",
      );

    if (declared && !fits(declared)) conflicts.push("content-declared");
    if (extensionTypes.length && !extensionTypes.some(fits))
      conflicts.push("content-extension");

    const fitting = matches
      .filter(
        (entry) => entry.match === "exact" || entry.match === "compatible",
      )
      .map((entry) => entry.type);

    if (best)
      return result(
        best.match === "exact" ? "recognized" : "compatible",
        best.type,
        fitting,
      );

    const detected = detection.types
      .map((id) => registry.get(id))
      .filter((type): type is FileType => !!type);

    if (!claims.length && detected[0])
      return result("recognized", detected[0], detected);
    return result(
      claims.length ? "conflict" : "unknown",
      detected[0] ?? null,
      detected,
    );
  }

  if (conflicts.length) return result("conflict", null, claims);
  return claims[0]
    ? result("inferred", claims[0], claims)
    : result("unknown", null, []);
};
