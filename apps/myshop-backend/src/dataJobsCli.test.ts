import { readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const collectImports = (file: string, seen = new Map<string, string[]>()) => {
  if (seen.has(file)) return seen;

  const specifiers = [
    ...readFileSync(file, "utf8").matchAll(/from "([^"]+)"/g),
  ].map((match) => match[1]!);

  seen.set(file, specifiers);
  for (const specifier of specifiers.filter((value) => value.startsWith(".")))
    collectImports(resolve(dirname(file), `${specifier}.ts`), seen);
  return seen;
};

describe("MyShop data-jobs CLI", () => {
  it("loads only job definitions and the database driver, never the application", () => {
    const graph = collectImports(
      resolve(import.meta.dirname, "dataJobsCli.ts"),
    );

    const files = [...graph.keys()].map((file) =>
      relative(import.meta.dirname, file),
    );

    const packages = new Set(
      [...graph.values()].flat().filter((value) => !value.startsWith(".")),
    );

    expect(files.sort()).toEqual([
      "createMyShopDataJobRunner.ts",
      "data-jobs/createMyShopDataJobs.ts",
      "data-jobs/createResetDemoProductsJob.ts",
      "data-jobs/demoProductDocument.ts",
      "data-jobs/demoProducts.ts",
      "data-jobs/myShopDatabaseName.ts",
      "data-jobs/readMongoUri.ts",
      "dataJobsCli.ts",
    ]);

    expect([...packages].sort()).toEqual([
      "@mp-lb/inproduct-data-jobs",
      "@mp-lb/inproduct-data-jobs/cli",
      "@mp-lb/inproduct-data-jobs/mongodb",
      "mongodb",
    ]);
  });
});
