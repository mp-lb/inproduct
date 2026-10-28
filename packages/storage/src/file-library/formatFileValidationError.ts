import { z } from "zod";

/** Exposes only schema-owned messages for editable metadata. Never serialize
 * raw Zod errors, request values, object URLs or arbitrary property paths. */
export const formatFileValidationError = (error: unknown): string | null => {
  if (!(error instanceof z.ZodError)) return null;

  const messages = error.issues.map((issue) => {
    if (issue.path[0] === "name") return `Name: ${issue.message}`;
    if (issue.path[0] === "tags") return `Tags: ${issue.message}`;
    return "Check the request values and try again.";
  });

  return [...new Set(messages)].join(" ");
};
