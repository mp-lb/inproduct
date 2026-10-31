import { z } from "zod";

export const dataJobIdSchema = z
  .string()
  .max(80)
  .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, "use a lowercase hyphenated ID");

/** Procedure input for `inspect` and `verify`: callers select a registered job only. */
export const dataJobRequestSchema = z.object({ id: dataJobIdSchema }).strict();

/** Procedure input for `run`. */
export const runDataJobSchema = z
  .object({
    id: dataJobIdSchema,
    confirmationToken: z.string().min(1).max(200),
    acceptDataLoss: z.boolean().optional(),
  })
  .strict();

export const dataJobMetadataSchema = z.object({
  id: dataJobIdSchema,
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(1000),
  scope: z.string().trim().min(1).max(500),
  destructive: z.boolean(),
  retryPolicy: z.enum(["safe_to_rerun", "manual_recovery"]),
});
