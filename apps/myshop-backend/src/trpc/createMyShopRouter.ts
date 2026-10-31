import type { DataJobRunner } from "@mp-lb/inproduct-data-jobs";
import { createDataJobsRouter } from "./createDataJobsRouter";
import { router } from "./myShopTrpc";

export const createMyShopRouter = (dataJobs: DataJobRunner | undefined) =>
  router({ dataJobs: createDataJobsRouter(dataJobs) });

export type MyShopRouter = ReturnType<typeof createMyShopRouter>;
