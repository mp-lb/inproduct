import type { z } from "zod";
import { listFilesSchema } from "./fileLibrarySchemas.js";
import type { Actor } from "./fileLibraryContracts.js";
import type { FileList, FileView } from "./fileLibraryTypes.js";
import type { FileLibraryContext } from "./createFileLibraryContext.js";
import { fileView } from "./fileView.js";
import { matchesFileQuery } from "./matchesFileQuery.js";

/** Authorization applies per row before filters and pagination, so cursors never leak hidden rows. */
export const createListFiles =
  ({ options }: FileLibraryContext) =>
  async (
    actor: Actor,
    raw: z.input<typeof listFilesSchema>,
  ): Promise<FileList> => {
    const input = listFilesSchema.parse(raw);
    const partition = await options.repository.read(actor.tenantId);
    const visible: FileView[] = [];

    for (const file of partition.files) {
      if (
        file.tenantId !== actor.tenantId ||
        !(await options.authorize({
          actor,
          action: "read",
          file: fileView(file),
        }))
      )
        continue;
      if (matchesFileQuery(file, input)) visible.push(fileView(file));
    }

    visible.sort((a, b) => a.id.localeCompare(b.id));

    const filtered = visible.filter(
      (file) => !input.cursor || file.id > input.cursor,
    );

    return {
      items: filtered.slice(0, input.limit),
      nextCursor:
        filtered.length > input.limit ? filtered[input.limit - 1].id : null,
    };
  };
