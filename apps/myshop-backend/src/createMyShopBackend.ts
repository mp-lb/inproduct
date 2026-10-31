import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import type { DataJobRunner } from "@mp-lb/inproduct-data-jobs";
import { createFileStorage } from "@mp-lb/inproduct-storage";
import {
  createDiskFileStorageAdapter,
  createFileStorageHandler,
} from "@mp-lb/inproduct-storage/node";
import { logger } from "@mp-lb/inproduct-server";
import { createHTTPHandler } from "@trpc/server/adapters/standalone";
import { isLocalRequest } from "./isLocalRequest";
import { createMyShopRouter } from "./trpc/createMyShopRouter";

/** Local demo only: one shop, loopback clients, no production authentication.
 * Data jobs are available when a runner is supplied (MyShop needs the local MongoDB for it).
 */
export const createMyShopBackend = ({
  directory = fileURLToPath(new URL("../.data/files", import.meta.url)),
  frontendOrigin,
  dataJobs,
}: {
  directory?: string;
  frontendOrigin: string;
  dataJobs?: DataJobRunner;
}) => {
  const storage = createFileStorage({
    adapter: createDiskFileStorageAdapter({ directory }),
  });

  const files = createFileStorageHandler({
    storage,
    authorize: (request) => isLocalRequest(request, frontendOrigin),
    onError: (error) =>
      logger.error("storage.failed", {
        error: error instanceof Error ? error.message : String(error),
      }),
  });

  const trpc = createHTTPHandler({
    router: createMyShopRouter(dataJobs),
    basePath: "/api/trpc/",
    createContext: ({ req }) => ({
      logger,
      isAdmin: isLocalRequest(req, frontendOrigin),
    }),
    onError: ({ error, path }) => {
      if (error.code === "INTERNAL_SERVER_ERROR")
        logger.error("trpc.failed", { path, error: error.message });
    },
  });

  return createServer((request, response) => {
    if (request.url === "/health" && request.method === "GET") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true, service: "myshop-backend" }));
      return;
    }

    if (request.url?.startsWith("/api/trpc/")) {
      trpc(request, response);
      return;
    }

    files(request, response);
  });
};
