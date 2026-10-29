import type {
  ContentDetection,
  ContentMatch,
  FileType,
} from "./fileTypeContracts.js";
import { contentContainers } from "./contentContainers.js";

/** Compares detected content with one type. `compatible` means the bytes show only
 * a generic container or text family the type belongs to. */
export const matchFileContent = (
  detection: ContentDetection,
  type: FileType,
): ContentMatch => {
  const ids = [type.id, ...type.aliases];
  if (detection.types.some((id) => ids.includes(id))) return "exact";
  const container = detection.container && contentContainers[detection.container];

  if (container) {
    const member =
      detection.container === "text"
        ? type.textual
        : container.members.includes(type.id);

    if (member && detection.types.every((id) => container.generic.includes(id)))
      return "compatible";
  }

  return detection.types.length || detection.container
    ? "mismatch"
    : "unrecognized";
};
