import type { ContentCheck, FileType } from "./fileTypeContracts.js";
import { contentContainers } from "./contentContainers.js";
import { exactlyDetectableFileTypes } from "./exactlyDetectableFileTypes.js";

/** Whether the built-in detector can enforce `check` for `type`. */
export const canCheckContent = (type: FileType, check: ContentCheck) => {
  if (check === "unchecked") return true;
  const ids = [type.id, ...type.aliases];
  if (ids.some((id) => exactlyDetectableFileTypes.has(id))) return true;
  return (
    check === "compatible" &&
    (type.textual ||
      Object.values(contentContainers).some((container) =>
        container.members.includes(type.id),
      ))
  );
};
