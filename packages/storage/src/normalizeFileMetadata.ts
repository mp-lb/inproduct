import { FileStorageError } from "./FileStorageError.js";
import type { FileMetadata } from "./fileTypes.js";

export const normalizeFileMetadata = (input: FileMetadata): FileMetadata => {
  const name = input.name.trim();
  if (
    !name ||
    name.length > 255 ||
    input.name.includes("/") ||
    input.name.includes("\\") ||
    [...input.name].some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    )
  )
    throw new FileStorageError(
      "INVALID_INPUT",
      "Use a file name of 1–255 characters without slashes or control characters.",
    );

  const tags = [
    ...new Set(input.tags.map((tag) => tag.trim()).filter(Boolean)),
  ];

  if (tags.length > 20 || tags.some((tag) => tag.length > 80))
    throw new FileStorageError(
      "INVALID_INPUT",
      "Use at most 20 tags, each up to 80 characters.",
    );
  return { name, tags };
};
