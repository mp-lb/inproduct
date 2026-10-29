import { FileStorageError } from "../FileStorageError.js";
import type { Actor } from "./fileLibraryContracts.js";
import type { FileLibraryContext } from "./createFileLibraryContext.js";
import { withStorageDeadline } from "./withStorageDeadline.js";
import { fileRecordName } from "./fileRecordName.js";
import { describeFileDownload } from "../file-types/describeFileDownload.js";

const downloadLifetimeMs = 60_000;

/** Reauthorizes and signs a short download of the pinned version only, with the
 * library's download name and served type (see `describeFileDownload`). */
export const createDownloadFile =
  ({ read, isAccepted, now, options, timeoutMs, types }: FileLibraryContext) =>
  async (actor: Actor, id: string) => {
    const file = await read(actor, id, "download");
    const version = file.version;
    if (!isAccepted(file) || !version)
      throw new FileStorageError(
        "PRECONDITION_FAILED",
        "file is not available",
      );
    const expiresAt = now() + downloadLifetimeMs;

    const download = describeFileDownload({
      ...fileRecordName(file, types.registry),
      type: types.registry.get(file.contentType),
      status: file.typeStatus ?? "inferred",
    });

    return {
      ...(await withStorageDeadline(
        (signal) =>
          options.driver.download({
            key: file.key,
            version,
            name: download.fileName,
            contentType: download.contentType,
            expiresAt,
            signal,
          }),
        timeoutMs,
      )),
      expiresAt,
    };
  };
