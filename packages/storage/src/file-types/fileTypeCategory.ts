import { z } from "zod";

export const fileTypeCategorySchema = z.enum([
  "image",
  "video",
  "audio",
  "document",
  "other",
]);
export type FileTypeCategory = z.infer<typeof fileTypeCategorySchema>;
