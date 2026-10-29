import type { z } from "zod";
import { listFilesSchema } from "./fileLibrarySchemas.js";
import type { Actor } from "./fileLibraryContracts.js";
import type { FileList, FileView } from "./fileLibraryTypes.js";
import type { FileLibraryContext } from "./createFileLibraryContext.js";
import { matchesFileQuery } from "./matchesFileQuery.js";

/** Authorization applies per row before filters and pagination, so cursors never leak hidden rows. */
export const createListFiles =
  ({ options, view }: FileLibraryContext) =>
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
          file: view(file),
        }))
      )
        continue;

      const links = (partition.links ?? [])
        .filter((link) => link.fileId === file.id)
        .map(({ type, targetId }) => ({ type, targetId }));

      if (
        input.linkedTo &&
        !links.some(
          (link) =>
            link.type === input.linkedTo!.type &&
            link.targetId === input.linkedTo!.targetId,
        )
      )
        continue;
      const projected = view(file);
      if (
        (!input.category || projected.type.category === input.category) &&
        matchesFileQuery(file, input)
      )
        visible.push({ ...projected, links });
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
