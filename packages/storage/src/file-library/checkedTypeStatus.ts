import type {
  ContentCheck,
  FileTypeStatus,
} from "../file-types/fileTypeContracts.js";

/** The status a passing byte check establishes. */
export const checkedTypeStatus = (check: ContentCheck): FileTypeStatus =>
  check === "exact"
    ? "recognized"
    : check === "compatible"
      ? "compatible"
      : "inferred";
