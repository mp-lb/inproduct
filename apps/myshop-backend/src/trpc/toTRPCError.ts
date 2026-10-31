import { AppError, type AppErrorCode } from "@mp-lb/fssstack-platform/errors";
import {
  DataJobError,
  type DataJobErrorCode,
} from "@mp-lb/inproduct-data-jobs";
import type { TRPC_ERROR_CODE_KEY } from "@trpc/server";

const codes: Record<DataJobErrorCode, [AppErrorCode, TRPC_ERROR_CODE_KEY]> = {
  NOT_FOUND: ["NOT_FOUND", "NOT_FOUND"],
  CONFIRMATION_REQUIRED: ["FAILED_PRECONDITION", "PRECONDITION_FAILED"],
  ALREADY_RUNNING: ["CONFLICT", "CONFLICT"],
};

/** Surfaces expected data-job failures through the platform formatter; anything else stays internal. */
export const toTRPCError = (error: unknown) => {
  if (!(error instanceof DataJobError)) return error;
  const [appCode, trpcCode] = codes[error.code];
  return new AppError({
    appCode,
    trpcCode,
    message: error.message,
  }).toTrpcError();
};
