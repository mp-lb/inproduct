import type { FileType, FileTypeRegistry } from "./fileTypeContracts.js";
import { findFileExtension } from "./findFileExtension.js";
import { splitFileNameSuffixes } from "./splitFileNameSuffixes.js";

const unknownType = "application/octet-stream";

/**
 * Splits an uploaded or legacy file name into an editable name and an extension
 * compatible with `type`. A suffix the type does not list stays in the name, so
 * `scan.v2` as plain text becomes `scan.v2` + `txt`. Unknown (`octet-stream`)
 * files keep an unregistered extension such as `.dat3` so renaming cannot alter it.
 */
export const deriveFileName = (
  fileName: string,
  type: FileType,
  registry: FileTypeRegistry,
): { name: string; extension: string | null } => {
  const compatible = splitFileNameSuffixes(fileName).find((split) =>
    type.extensions.includes(split.extension),
  );

  if (compatible)
    return { name: compatible.stem, extension: compatible.extension };

  if (type.id === unknownType) {
    const found = findFileExtension(fileName, registry);
    if (found && !found.registered)
      return { name: found.stem, extension: found.extension };
  }

  return { name: fileName.trim(), extension: type.extensions[0] ?? null };
};
