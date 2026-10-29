import { z } from "zod";
import { fileLinkTargetSchema } from "./fileLinks.js";

/** Largest object the managed file library accepts, verifies or scans. */
export const maxLibraryFileBytes = 50 * 1024 * 1024;

/** Common types for consumers that want an explicit restricted policy. */
export const libraryContentTypes = [
  "application/pdf",
  "text/plain",
  "image/png",
  "image/jpeg",
] as const;

export const fileCategorySchema = z.enum([
  "user",
  "application",
  "admin",
  "shareable",
]);

export const fileStateSchema = z.enum([
  "pending",
  "verifying",
  "available",
  "quarantined",
  "deleted",
]);

export const fileNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a file name.")
  .max(255, "Use a file name of 255 characters or fewer.")
  .refine(
    (name) =>
      !Array.from(name).some(
        (character) =>
          character.charCodeAt(0) < 32 ||
          character.charCodeAt(0) === 127 ||
          character === "/" ||
          character === "\\",
      ),
    "Remove slashes and control characters from the file name.",
  );

export const fileTagsSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1, "Enter a tag or remove the empty entry.")
      .max(40, "Keep each tag to 40 characters or fewer."),
  )
  .max(12, "Use no more than 12 tags.")
  .transform((tags) => [...new Set(tags)].sort());

export const beginFileSchema = z
  .object({
    operationId: z.uuid(),
    scope: z.string().min(1).max(160),
    /** The uploaded file name, including its extension. */
    name: fileNameSchema,
    /** The client-reported type, such as `File.type`. Optional evidence only. */
    contentType: z.string().trim().max(255).optional(),
    sizeBytes: z.number().int().positive().max(maxLibraryFileBytes),
    checksum: z.string().regex(/^[a-f0-9]{64}$/),
    category: fileCategorySchema,
    tags: fileTagsSchema.default([]),
  })
  .strict();

export const fileIdSchema = z.object({ fileId: z.uuid() }).strict();

export const fileQuotaSchema = z
  .object({
    quotaBytes: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  })
  .strict();

export const editFileSchema = fileIdSchema
  .extend({
    revision: z.number().int().nonnegative(),
    /** The new name. A trailing extension the file already has is removed. */
    name: fileNameSchema,
    tags: fileTagsSchema,
  })
  .strict();

export const listFilesSchema = z
  .object({
    linkedTo: fileLinkTargetSchema.optional(),
    scope: z.string().max(160).optional(),
    search: z.string().max(100).default(""),
    category: fileCategorySchema.optional(),
    state: fileStateSchema.optional(),
    tag: z.string().max(40).optional(),
    cursor: z.uuid().optional(),
    limit: z.number().int().min(1).max(100).default(25),
  })
  .strict();
