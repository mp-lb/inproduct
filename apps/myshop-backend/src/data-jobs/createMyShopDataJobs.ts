import { createRemoveFieldsJob } from "@mp-lb/inproduct-data-jobs/mongodb";
import type { Db } from "mongodb";
import { createResetDemoProductsJob } from "./createResetDemoProductsJob";
import type { DemoProductDocument } from "./demoProductDocument";

/** MyShop's job registry. Imports only job definitions so the CLI can load without the app. */
export const createMyShopDataJobs = (db: Db) => [
  createRemoveFieldsJob({
    id: "remove-legacy-product-fields",
    title: "Remove legacy product fields",
    description:
      "Removes the retired legacyPrice and internal.notes fields from archived products.",
    collection: db.collection("products"),
    fields: ["legacyPrice", "internal.notes"],
    filter: { status: "archived" },
    scope: `Archived products in ${db.databaseName}.products`,
  }),
  createResetDemoProductsJob(db.collection<DemoProductDocument>("products")),
];
