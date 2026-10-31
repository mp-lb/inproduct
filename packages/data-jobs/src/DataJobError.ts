export type DataJobErrorCode =
  | "NOT_FOUND"
  | "CONFIRMATION_REQUIRED"
  | "ALREADY_RUNNING";

/** Expected request failures safe to expose across a transport boundary. */
export const DataJobError = class extends Error {
  readonly code: DataJobErrorCode;
  constructor(code: DataJobErrorCode, message: string) {
    super(message);
    this.name = "DataJobError";
    this.code = code;
  }
};
