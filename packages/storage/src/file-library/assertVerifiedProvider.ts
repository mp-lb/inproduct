import { FileStorageError } from "../FileStorageError.js";
import type { FileLibraryOptions } from "./fileLibraryContracts.js";

/** Fails closed unless the configured adapters can produce verified, immutable content. */
export const assertVerifiedProvider = (options: FileLibraryOptions) => {
  if (
    ((options.malwarePolicy ?? "required") === "required" &&
      !options.scanner) ||
    (options.malwarePolicy === "allow-unscanned" && !options.byteValidator) ||
    options.driver.capabilities.versioned !== true ||
    options.driver.capabilities.checksum !== true ||
    options.driver.capabilities.conditionalCreate !== true
  )
    throw new FileStorageError(
      "PRECONDITION_FAILED",
      "verified storage is unavailable",
    );
};
