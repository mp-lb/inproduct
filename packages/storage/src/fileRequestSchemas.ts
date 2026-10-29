import { z } from "zod";
import { FileStorageError } from "./FileStorageError.js";

export const fileMetadataSchema = z
  .object({
    name: z.string().max(255),

    tags: z.array(z.string().max(80)).max(20),
  })
  .strict();
export const fileQuerySchema = z
  .object({
    search: z.string().max(1000).optional(),

    tag: z.string().max(80).optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export const parseFileRequest = <T>(
  schema: z.ZodType<T>,
  value: unknown,
): T => {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new FileStorageError("INVALID_INPUT", "invalid file request");
  return result.data;
};
