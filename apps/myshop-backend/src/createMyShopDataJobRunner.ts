import { createDataJobRunner } from "@mp-lb/inproduct-data-jobs";
import { MongoClient } from "mongodb";
import { createMyShopDataJobs } from "./data-jobs/createMyShopDataJobs";
import { myShopDatabaseName } from "./data-jobs/myShopDatabaseName";

/** Connects lazily: MyShop starts even when MongoDB is down, and jobs report the failure. */
export const createMyShopDataJobRunner = (
  uri: string,
  databaseName = myShopDatabaseName(),
) => {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });

  const runner = createDataJobRunner({
    jobs: createMyShopDataJobs(client.db(databaseName)),
  });

  return { client, runner };
};
