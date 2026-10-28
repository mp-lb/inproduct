import type { z } from "zod";
import { FileStorageError } from "../FileStorageError.js";
import { editFileSchema } from "./fileLibrarySchemas.js";
import type { Actor } from "./fileLibraryContracts.js";
import type { FileLibraryContext } from "./createFileLibraryContext.js";
import { fileView } from "./fileView.js";

/** Optimistic metadata edit: the caller supplies the file revision it saw. */
export const createEditFile =
  ({ read, mutate, find, touch }: FileLibraryContext) =>
  async (actor: Actor, raw: z.input<typeof editFileSchema>) => {
    const input = editFileSchema.parse(raw);
    await read(actor, input.fileId, "write");
    return mutate(actor, (partition) => {
      const file = find(partition, input.fileId);
      if (file.revision !== input.revision || file.state === "deleted")
        throw new FileStorageError("CONFLICT", "file changed");
      file.name = input.name;
      file.tags = input.tags;
      touch(partition, file, actor, "metadata.updated");
      return fileView(file);
    });
  };
