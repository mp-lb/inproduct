import type { Actor } from "./fileLibraryContracts.js";
import type { FileLibraryContext } from "./createFileLibraryContext.js";
import { fileLinkSchema, type FileLink } from "./fileLinks.js";
import { FileStorageError } from "../FileStorageError.js";

export const createFileLinks = (context: FileLibraryContext) => {
  const { options, read, allow, mutate, find, touch } = context;

  const change = async (actor: Actor, raw: FileLink, remove: boolean) => {
    const input = fileLinkSchema.parse(raw);
    const action = remove ? "unlink" : "link";
    const original = await read(actor, input.fileId, "read");
    await allow(actor, action, original, { link: input });
    return mutate(actor, (partition) => {
      const file = find(partition, input.fileId);
      if (file.revision !== original.revision)
        throw new FileStorageError(
          "CONFLICT",
          "file changed; reload and retry",
        );
      if (!remove && file.state !== "available")
        throw new FileStorageError(
          "PRECONDITION_FAILED",
          "file is not available",
        );
      const links = partition.links ?? [];

      const matches = (link: FileLink) =>
        link.fileId === input.fileId &&
        link.type === input.type &&
        link.targetId === input.targetId;

      const exists = links.some(matches);
      if (exists === !remove) return;
      const limit = options.maxLinksPerType?.[input.type];
      if (
        !remove &&
        limit &&
        links.filter(
          (link) => link.fileId === input.fileId && link.type === input.type,
        ).length >= limit
      )
        throw new FileStorageError("CONFLICT", "file link limit reached");
      partition.links = remove
        ? links.filter((link) => !matches(link))
        : [...links, input];

      touch(partition, file, actor, remove ? "unlinked" : "linked");
      partition.audit[partition.audit.length - 1].details.link = {
        type: input.type,
        targetId: input.targetId,
      };
    });
  };

  return {
    link: (actor: Actor, input: FileLink) => change(actor, input, false),
    unlink: (actor: Actor, input: FileLink) => change(actor, input, true),
  };
};
