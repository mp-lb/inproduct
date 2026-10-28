import type { Scanner } from "./fileLibraryContracts.js";
import type { ReadObjectVersion } from "./readObjectVersion.js";
import { verifyFileBytes } from "./verifyFileBytes.js";
import { clamdRequest } from "./clamdRequest.js";
import { assertFreshClamd } from "./assertFreshClamd.js";

/** ClamAV adapter: validates exact version bytes, then streams them to a private clamd. */
export const createClamdScanner = (options: {
  endpoint: string;
  readVersion: ReadObjectVersion;
  now?: () => number;
}): Scanner => {
  let busy = false;
  return {
    scan: async ({ key, version, checksum, contentType, signal }) => {
      if (busy) throw new Error("scanner busy; retry verification");
      busy = true;

      try {
        await assertFreshClamd(
          options.endpoint,
          (options.now ?? Date.now)(),
          signal,
        );
        const bytes = await options.readVersion(key, version, signal);
        if (!verifyFileBytes(bytes, checksum, contentType)) return "rejected";

        const result = await clamdRequest(
          options.endpoint,
          "INSTREAM",
          bytes,
          signal,
        );

        if (result === "stream: OK") return "clean";
        if (/^stream: .+ FOUND$/.test(result)) return "rejected";
        throw new Error("scanner did not return a complete verdict");
      } finally {
        busy = false;
      }
    },
  };
};
