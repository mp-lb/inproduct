import type { FileLibraryOptions, FileRecord } from "./fileLibraryContracts.js";

/** Available, version-pinned and either clean or explicitly allowed unscanned. */
export const isAcceptedFile = (
  options: Pick<FileLibraryOptions, "malwarePolicy">,
  file: FileRecord,
) =>
  file.state === "available" &&
  !!file.version &&
  (file.scan === "clean" ||
    (file.scan === "not_scanned" &&
      options.malwarePolicy === "allow-unscanned" &&
      file.malwarePolicy === "allow-unscanned"));
