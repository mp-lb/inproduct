import type { ByteValidator } from "./fileLibraryContracts.js";
import type { ReadObjectVersion } from "./readObjectVersion.js";
import { verifyFileBytes } from "./verifyFileBytes.js";

/** Byte validation without malware scanning. Runs one validation at a time per instance. */
export const createFileByteValidator = (
  readVersion: ReadObjectVersion,
): ByteValidator => {
  let busy = false;
  return {
    validate: async ({ key, version, checksum, contentType, signal }) => {
      if (busy) throw new Error("byte validation busy; retry verification");
      busy = true;

      try {
        return verifyFileBytes(
          await readVersion(key, version, signal),
          checksum,
          contentType,
        );
      } finally {
        busy = false;
      }
    },
  };
};
