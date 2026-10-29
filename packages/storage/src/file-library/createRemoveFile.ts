import { FileStorageError } from "../FileStorageError.js";
import type { Actor } from "./fileLibraryContracts.js";
import type { FileLibraryContext } from "./createFileLibraryContext.js";

/** Soft deletion. Retention holds and unsettled verification block it; bytes and quota are kept. */
export const createRemoveFile =
  ({ read, mutate, find, touch, now, view }: FileLibraryContext) =>
  async (actor: Actor, id: string) => {
    await read(actor, id, "delete");
    return mutate(actor, (partition) => {
      const file = find(partition, id);
      if (file.holds.some((hold) => hold.state !== "released"))
        throw new FileStorageError(
          "CONFLICT",
          "file is retained by a consumer",
        );
      if (file.state === "verifying")
        throw new FileStorageError(
          "CONFLICT",
          "verification must settle before deletion",
        );

      if (file.state !== "deleted") {
        file.state = "deleted";
        file.deletedAt = now();
        touch(partition, file, actor, "deleted");
      }

      return view(file);
    });
  };
