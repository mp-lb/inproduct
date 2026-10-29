import { fileRecordType } from "./fileRecordType.js";
import type { z } from "zod";
import { FileStorageError } from "../FileStorageError.js";
import { editFileSchema } from "./fileLibrarySchemas.js";
import type { Actor } from "./fileLibraryContracts.js";
import type { FileLibraryContext } from "./createFileLibraryContext.js";
import { fileRecordName } from "./fileRecordName.js";
import { stripTypeExtension } from "../file-types/stripTypeExtension.js";

/** Optimistic metadata edit: the caller supplies the file revision it saw.
 * Renaming never changes the extension, type or bytes. Legacy records are
 * rewritten with a separate name and extension. */
export const createEditFile =
  ({ read, mutate, find, touch, types, view }: FileLibraryContext) =>
  async (actor: Actor, raw: z.input<typeof editFileSchema>) => {
    const input = editFileSchema.parse(raw);
    await read(actor, input.fileId, "write");
    return mutate(actor, (partition) => {
      const file = find(partition, input.fileId);
      if (file.revision !== input.revision || file.state === "deleted")
        throw new FileStorageError("CONFLICT", "file changed");
      const { extension } = fileRecordName(file, types.registry);

      const compatible = [
        ...(fileRecordType(file, types.registry)?.extensions ?? []),
        ...(extension ? [extension] : []),
      ];

      file.name = stripTypeExtension(input.name, compatible);
      file.extension = extension;
      file.tags = input.tags;
      touch(partition, file, actor, "metadata.updated");
      return view(file);
    });
  };
