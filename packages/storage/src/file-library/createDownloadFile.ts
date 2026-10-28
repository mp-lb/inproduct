import { FileStorageError } from "../FileStorageError.js";
import type { Actor } from "./fileLibraryContracts.js";
import type { FileLibraryContext } from "./createFileLibraryContext.js";
import { withStorageDeadline } from "./withStorageDeadline.js";

const downloadLifetimeMs = 60_000;

/** Reauthorizes and signs a short download of the pinned version only. */
export const createDownloadFile =
  ({ read, isAccepted, now, options, timeoutMs }: FileLibraryContext) =>
  async (actor: Actor, id: string) => {
    const file = await read(actor, id, "download");
    const version = file.version;
    if (!isAccepted(file) || !version)
      throw new FileStorageError(
        "PRECONDITION_FAILED",
        "file is not available",
      );
    const expiresAt = now() + downloadLifetimeMs;
    return {
      ...(await withStorageDeadline(
        (signal) =>
          options.driver.download({
            key: file.key,
            version,
            name: file.name,
            expiresAt,
            signal,
          }),
        timeoutMs,
      )),
      expiresAt,
    };
  };
