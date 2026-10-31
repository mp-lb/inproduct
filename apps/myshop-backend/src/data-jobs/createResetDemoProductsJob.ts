import { defineDataJob } from "@mp-lb/inproduct-data-jobs";
import type { Collection } from "mongodb";
import type { DemoProductDocument } from "./demoProductDocument";
import { demoProducts } from "./demoProducts";

/** Application-defined job: replaces the disposable demo collection with seed data. */
export const createResetDemoProductsJob = (
  products: Collection<DemoProductDocument>,
) =>
  defineDataJob({
    id: "reset-demo-products",
    title: "Reset demo products",
    description:
      "Deletes every MyShop demo product and restores the synthetic legacy seed data.",
    scope: `All documents in ${products.dbName}.${products.collectionName}`,
    destructive: true,
    retryPolicy: "safe_to_rerun",
    inspect: async () => {
      const existing = await products.countDocuments();
      return {
        summary: `Deletes ${existing} documents and inserts ${demoProducts.length} seed products.`,
        matchedCount: existing,
        changes: [
          { label: "Delete product", count: existing },
          { label: "Insert seed product", count: demoProducts.length },
        ],
        warnings: [],
      };
    },
    run: async ({ reportProgress }) => {
      reportProgress({ completed: 0, total: demoProducts.length });
      const { deletedCount } = await products.deleteMany({});
      await products.insertMany(
        demoProducts.map((product) => structuredClone(product)),
      );

      reportProgress({
        completed: demoProducts.length,
        total: demoProducts.length,
      });

      return {
        summary: `Restored ${demoProducts.length} seed products.`,
        changedCount: deletedCount + demoProducts.length,
        skippedCount: 0,
        changes: [
          { label: "Deleted product", count: deletedCount },
          { label: "Inserted seed product", count: demoProducts.length },
        ],
      };
    },
    verify: async () => {
      const count = await products.countDocuments({
        _id: { $in: demoProducts.map(({ _id }) => _id) },
      });

      const missing = demoProducts.length - count;
      return {
        passed: missing === 0,
        remainingCount: missing,
        summary: missing
          ? `${missing} seed products are missing.`
          : "All seed products are present.",
      };
    },
  });
