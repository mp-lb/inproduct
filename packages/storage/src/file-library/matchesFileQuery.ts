import type { z } from "zod";
import type { listFilesSchema } from "./fileLibrarySchemas.js";
import type { FileRecord } from "./fileLibraryContracts.js";

/** Deleted tombstones appear only when explicitly requested with `state: "deleted"`. */
export const matchesFileQuery = (
  file: FileRecord,
  input: z.output<typeof listFilesSchema>,
) =>
  (!input.scope || file.scope === input.scope) &&
  (input.state ? file.state === input.state : file.state !== "deleted") &&
  (!input.tag || file.tags.includes(input.tag)) &&
  `${file.name} ${file.tags.join(" ")}`
    .toLowerCase()
    .includes(input.search.toLowerCase());
