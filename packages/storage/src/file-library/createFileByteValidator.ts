import type { ByteValidator } from "./fileLibraryContracts.js";
import type { ReadObjectVersion } from "./readObjectVersion.js";
import type { FileTypeRegistry } from "../file-types/fileTypeContracts.js";
import { inspectFileBytes } from "./inspectFileBytes.js";

/** Byte validation without malware scanning. Runs one validation at a time per
 * instance and reports whether the bytes were recognized or only compatible.
 * Pass the library's registry when it defines custom types. */
export const createFileByteValidator = (
  readVersion: ReadObjectVersion,
  registry?: FileTypeRegistry,
): ByteValidator => {
  let busy = false;
  return {
    validate: async ({
      key,
      version,
      checksum,
      contentType,
      contentCheck,
      signal,
    }) => {
      if (busy) throw new Error("byte validation busy; retry verification");
      busy = true;

      try {
        return inspectFileBytes(
          await readVersion(key, version, signal),
          checksum,
          contentType,
          contentCheck,
          registry,
        );
      } finally {
        busy = false;
      }
    },
  };
};
