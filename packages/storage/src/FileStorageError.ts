/** Expected file-operation failures safe to expose across a transport boundary. */
export const FileStorageError = class extends Error {
  readonly code: "INVALID_INPUT" | "NOT_FOUND" | "TOO_LARGE" | "FORBIDDEN";
  constructor(
    code: "INVALID_INPUT" | "NOT_FOUND" | "TOO_LARGE" | "FORBIDDEN",
    message: string,
  ) {
    super(message);
    this.name = "FileStorageError";
    this.code = code;
  }
};
