import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { createFileStorage } from "@mp-lb/inproduct-storage";
import {
  createDiskFileStorageAdapter,
  createFileStorageHandler,
} from "@mp-lb/inproduct-storage/node";
import { logger } from "@mp-lb/inproduct-server";

/** Local demo only: one shop, loopback clients, no production authentication. */
export const createMyShopBackend = ({
  directory = fileURLToPath(new URL("../.data/files", import.meta.url)),
  frontendOrigin,
}: {
  directory?: string;
  frontendOrigin: string;
}) => {
  const storage = createFileStorage({
    adapter: createDiskFileStorageAdapter({ directory }),
  });

  const files = createFileStorageHandler({
    storage,
    authorize: (request) => {
      const host = request.headers.host;
      if (!host || !/^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(host))
        return false;
      if (request.headers["sec-fetch-site"] === "cross-site") return false;
      const origin = request.headers.origin;
      return (
        !origin ||
        origin === frontendOrigin ||
        origin === frontendOrigin.replace("127.0.0.1", "localhost") ||
        origin === `http://${host}`
      );
    },
    onError: (error) =>
      logger.error("storage.failed", {
        error: error instanceof Error ? error.message : String(error),
      }),
  });

  return createServer((request, response) => {
    if (request.url === "/health" && request.method === "GET") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true, service: "myshop-backend" }));
      return;
    }

    files(request, response);
  });
};
