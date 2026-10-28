export type FileStorageErrorCode =
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "TOO_LARGE"
  | "FORBIDDEN"
  | "CONFLICT"
  | "PRECONDITION_FAILED";

/** Expected file-operation failures safe to expose across a transport boundary. */
export const FileStorageError = class extends Error {
  readonly code: FileStorageErrorCode;
  constructor(code: FileStorageErrorCode, message: string) {
    super(message);
    this.name = "FileStorageError";
    this.code = code;
  }
};
