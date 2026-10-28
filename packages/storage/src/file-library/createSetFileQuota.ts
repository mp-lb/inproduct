import { fileQuotaSchema } from "./fileLibrarySchemas.js";
import type { Actor } from "./fileLibraryContracts.js";
import type { FileLibraryContext } from "./createFileLibraryContext.js";

export const createSetFileQuota =
  ({ allow, mutate, now }: FileLibraryContext) =>
  async (actor: Actor, raw: unknown) => {
    const { quotaBytes } = fileQuotaSchema.parse(raw);
    await allow(actor, "configure");
    return mutate(actor, (partition) => {
      partition.quotaBytes = quotaBytes;
      partition.quotaUpdatedAt = now();
      partition.quotaUpdatedBy = actor.id;
      return { quotaBytes };
    });
  };
