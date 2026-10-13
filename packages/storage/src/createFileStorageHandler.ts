import type { IncomingMessage, RequestListener } from "node:http";
import { FileStorageError } from "./FileStorageError.js";
import { dispatchFileRequest } from "./dispatchFileRequest.js";
import type { FileStorageClient } from "./fileTypes.js";

/** Mount a file API on a Node HTTP server. Authorization is required and runs before every operation.
 * The default path is /api/files; maxRequestBytes bounds multipart overhead as well as bytes.
 * For multi-tenant systems, bind a separately authorized, scoped storage client per tenant.
 */
export const createFileStorageHandler = ({
  storage,
  authorize,
  path = "/api/files",
  maxRequestBytes = 11 * 1024 * 1024,
  onError,
}: {
  storage: FileStorageClient;
  authorize: (request: IncomingMessage) => boolean | Promise<boolean>;
  path?: string;
  maxRequestBytes?: number;
  onError?: (error: unknown) => void;
}): RequestListener => {
  if (!/^\/[a-zA-Z0-9/_-]+$/.test(path) || path.endsWith("/"))
    throw new TypeError("invalid API path");
  if (!Number.isSafeInteger(maxRequestBytes) || maxRequestBytes < 0)
    throw new RangeError("invalid request limit");

  return (request, response) => {
    const dispatch = async () => {
      if (!(await authorize(request)))
        throw new FileStorageError("FORBIDDEN", "access denied");
      const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
      if (pathname !== path && !pathname.startsWith(`${path}/`))
        throw new FileStorageError("NOT_FOUND", "route not found");
      await dispatchFileRequest(
        request,
        response,
        storage,
        path,
        maxRequestBytes,
      );
    };

    void dispatch().catch((error: unknown) => {
      const known = error instanceof FileStorageError;

      const status = known
        ? {
            INVALID_INPUT: 400,
            NOT_FOUND: 404,
            TOO_LARGE: 413,
            FORBIDDEN: 403,
          }[error.code]
        : 500;

      if (!known) onError?.(error);

      if (response.headersSent) {
        response.destroy();
        return;
      }

      response.writeHead(status, {
        "content-type": "application/json",
        "cache-control": "no-store",
        connection: "close",
      });

      response.end(
        JSON.stringify({
          error: known ? error.message : "file operation failed",
        }),
      );

      request.resume();
    });
  };
};
