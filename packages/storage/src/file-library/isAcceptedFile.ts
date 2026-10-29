import type { FileLibraryOptions, FileRecord } from "./fileLibraryContracts.js";

/** Available, with any required version pin and either clean or explicitly allowed unscanned. */
export const isAcceptedFile = (
  options: Pick<FileLibraryOptions, "malwarePolicy">,
  file: FileRecord,
) =>
  file.state === "available" &&
  (!!file.version || file.versionPinning === false) &&
  (file.scan === "clean" ||
    (file.scan === "not_scanned" &&
      options.malwarePolicy === "allow-unscanned" &&
      file.malwarePolicy === "allow-unscanned"));
