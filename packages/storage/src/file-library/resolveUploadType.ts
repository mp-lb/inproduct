import { FileStorageError } from "../FileStorageError.js";
import { deriveFileName } from "../file-types/deriveFileName.js";
import { identifyFileType } from "../file-types/identifyFileType.js";
import type { ResolvedFileTypePolicy } from "./resolveFileTypePolicy.js";

/**
 * Chooses the canonical type for a new upload from its file name and the
 * client-reported type. This is inference only: finalize checks the bytes.
 * Name/type conflicts follow `onConflict`; unaccepted types are rejected.
 */
export const resolveUploadType = (
  fileName: string,
  declaredType: string | undefined,
  policy: ResolvedFileTypePolicy,
) => {
  const { registry, accepted, onConflict } = policy;

  const identified = identifyFileType(
    { fileName, declaredType },
    registry,
  );

  const { extension, declared } = identified.evidence;
  let type = identified.type;

  if (identified.status === "conflict") {
    if (onConflict === "reject")
      throw new FileStorageError(
        "INVALID_INPUT",
        "The file name does not match the reported file type.",
      );
    const preferred =
      onConflict === "prefer-extension" ? extension?.types[0] : declared?.type;
    type = preferred ? (registry.get(preferred) ?? null) : null;
  }

  type ??= registry.get("application/octet-stream") ?? null;

  if (!type || !accepted.has(type.id))
    throw new FileStorageError(
      "INVALID_INPUT",
      "This file type is not supported.",
    );
  return { type, ...deriveFileName(fileName, type, registry) };
};
