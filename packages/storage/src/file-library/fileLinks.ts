import { z } from "zod";

export const fileLinkTargetSchema = z
  .object({
    type: z.string().trim().min(1).max(80),
    targetId: z.string().trim().min(1).max(200),
  })
  .strict();

export const fileLinkSchema = fileLinkTargetSchema
  .extend({ fileId: z.uuid() })
  .strict();
export type FileLinkTarget = z.infer<typeof fileLinkTargetSchema>;
export type FileLink = z.infer<typeof fileLinkSchema>;
