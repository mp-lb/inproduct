// @vitest-environment jsdom
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { findByRole, getByRole, waitFor } from "@testing-library/dom";
import { createDataJobRunner } from "@mp-lb/inproduct-data-jobs";
import { mountDataJobsPanel } from "@mp-lb/inproduct-data-jobs/panel";
import { createDataJobsTRPCClient } from "@mp-lb/inproduct-data-jobs/trpc";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { MongoClient } from "mongodb";
import superjson from "superjson";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMyShopBackend } from "../createMyShopBackend";
import { createMyShopDataJobs } from "../data-jobs/createMyShopDataJobs";
import { listenForTests } from "../listenForTests";
import type { MyShopRouter } from "./createMyShopRouter";

const uri = process.env.INPRODUCT_MONGO_TEST_URI;
const backendDirectory = resolve(import.meta.dirname, "../..");

const createTrpc = (base: string, origin?: string) =>
  createTRPCClient<MyShopRouter>({
    links: [
      httpBatchLink({
        url: `${base}/api/trpc`,
        transformer: superjson,
        headers: origin ? { origin } : {},
      }),
    ],
  });

const startBackend = async (databaseName?: string, client?: MongoClient) => {
  const directory = await mkdtemp(join(tmpdir(), "myshop-data-jobs-"));

  const dataJobs =
    client && databaseName
      ? createDataJobRunner({
          jobs: createMyShopDataJobs(client.db(databaseName)),
        })
      : undefined;

  const server = createMyShopBackend({
    directory,
    frontendOrigin: "http://localhost",
    dataJobs,
  });

  const base = await listenForTests(server);
  return {
    base,
    stop: async () => {
      await new Promise((resolve) => server.close(resolve));
      await rm(directory, { recursive: true, force: true });
    },
  };
};

// The panel re-renders on every state change, so act on the current, enabled control.
const click = async (container: HTMLElement, name: string) =>
  (
    await waitFor(
      () => {
        const button = getByRole(container, "button", {
          name,
        }) as HTMLButtonElement;

        if (button.disabled) throw new Error(`${name} is disabled`);
        return button;
      },
      { timeout: 5000 },
    )
  ).click();

const runInPanel = async (panel: HTMLElement, title: string) => {
  const latest = () =>
    getByRole(panel, "article", { name: title }).querySelector(
      ".data-job-result",
    )?.textContent;

  const card = await findByRole(
    panel,
    "article",
    { name: title },
    { timeout: 5000 },
  );

  const previous = latest();
  await click(card, "Inspect");

  // Wait for the inspection to settle so the checkbox is the live, connected one.
  const preview = await waitFor(
    () => {
      if (panel.textContent?.includes("Working…"))
        throw new Error("inspecting");
      return getByRole(panel, "region", { name: `Preview ${title}` });
    },
    { timeout: 5000 },
  );

  const summary = preview.textContent ?? "";
  getByRole(preview, "checkbox", { name: /permanently deletes data/ }).click();
  await click(panel, "Confirm and run");

  const result = await waitFor(
    () => {
      const text = latest();
      if (text && text !== previous && !panel.textContent?.includes("Working…"))
        return text;
      throw new Error("run still in progress");
    },
    { timeout: 5000 },
  );

  return { summary, result };
};

describe("MyShop data jobs router", () => {
  it("reports when MongoDB is not configured", async () => {
    const backend = await startBackend();

    try {
      await expect(
        createTrpc(backend.base).dataJobs.list.query(),
      ).rejects.toThrow("zap up mongodb");
    } finally {
      await backend.stop();
    }
  });

  describe.skipIf(!uri)("with MongoDB", () => {
    const client = new MongoClient(uri ?? "mongodb://127.0.0.1:27017");
    const databaseName = `myshop_data_jobs_test_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
    const products = () => client.db(databaseName).collection("products");

    beforeAll(async () => client.connect());
    afterAll(async () => {
      await client.db(databaseName).dropDatabase();
      await client.close();
    });

    it("runs Remove fields end to end through the panel, tRPC and MongoDB", async () => {
      const backend = await startBackend(databaseName, client);
      const element = document.createElement("div");
      document.body.append(element);

      const panel = mountDataJobsPanel(
        element,
        createDataJobsTRPCClient(createTrpc(backend.base).dataJobs),
        {
          pollMs: 10,
        },
      );

      try {
        const reset = await runInPanel(element, "Reset demo products");
        expect(reset.summary).toContain(
          "Deletes 0 documents and inserts 5 seed products.",
        );

        expect(reset.result).toContain("Run succeeded");

        const first = await runInPanel(element, "Remove legacy product fields");
        expect(first.summary).toContain("Archived products in");
        expect(first.summary).toContain("Remove legacyPrice3");
        expect(first.summary).toContain("Remove internal.notes1");
        expect(first.summary).toContain("Safe to rerun");
        expect(first.result).toContain("Removed fields from 3 documents.");
        expect(first.result).toContain("Verification passed");

        // Out-of-scope and unrelated data is untouched.
        expect(
          await products().findOne({ _id: "linen-napkins" as never }),
        ).toMatchObject({
          legacyPrice: "24.00",
          internal: { sku: "NAP-4", notes: "Reorder in spring" },
        });

        expect(
          await products().findOne({ _id: "stoneware-bowl" as never }),
        ).toEqual({
          _id: "stoneware-bowl",
          name: "Stoneware bowl",
          status: "archived",
          price: 2200,
          internal: { sku: "BWL-2" },
        });

        const second = await runInPanel(
          element,
          "Remove legacy product fields",
        );

        expect(second.summary).toContain("Nothing to remove.");
        expect(second.result).toContain(
          "Fields were already removed. Nothing changed.",
        );
      } finally {
        panel.destroy();
        element.remove();
        await backend.stop();
      }
    }, 30_000);

    it("authorizes on the server and accepts only registered job selections", async () => {
      const backend = await startBackend(databaseName, client);
      const trpc = createTrpc(backend.base);

      try {
        await expect(
          createTrpc(
            backend.base,
            "https://other.example",
          ).dataJobs.list.query(),
        ).rejects.toThrow("Admin access required.");

        await expect(
          trpc.dataJobs.inspect.mutate({ id: "drop-everything" }),
        ).rejects.toThrow("Unknown data job");

        await expect(
          trpc.dataJobs.run.mutate({
            id: "remove-legacy-product-fields",
            confirmationToken: "x",
            acceptDataLoss: true,
            collection: "users",
          } as never),
        ).rejects.toMatchObject({ data: { code: "BAD_REQUEST" } });

        await expect(
          trpc.dataJobs.run.mutate({
            id: "remove-legacy-product-fields",
            confirmationToken: "stale",
            acceptDataLoss: true,
          }),
        ).rejects.toMatchObject({ data: { code: "PRECONDITION_FAILED" } });
      } finally {
        await backend.stop();
      }
    });

    it("runs the same jobs from the standalone CLI", async () => {
      await products().deleteMany({});
      await products().insertOne({
        _id: "legacy-only" as never,
        status: "archived",
        legacyPrice: "1.00",
      });

      const cli = (...args: string[]) =>
        promisify(execFile)(
          join(backendDirectory, "../../node_modules/.bin/tsx"),
          ["src/dataJobsCli.ts", ...args],
          {
            cwd: backendDirectory,
            env: {
              ...process.env,
              MYSHOP_MONGO_URI: uri,
              MYSHOP_DATABASE: databaseName,
            },
          },
        );

      const inspected = JSON.parse(
        (await cli("inspect", "remove-legacy-product-fields", "--json")).stdout,
      );

      expect(inspected.inspection.matchedCount).toBe(1);
      await expect(
        cli("run", "remove-legacy-product-fields", "--yes"),
      ).rejects.toMatchObject({
        stderr: expect.stringContaining("--accept-data-loss"),
      });

      expect(
        await products().countDocuments({ legacyPrice: { $exists: true } }),
      ).toBe(1);

      const run = JSON.parse(
        (
          await cli(
            "run",
            "remove-legacy-product-fields",
            "--yes",
            "--accept-data-loss",
            "--json",
          )
        ).stdout,
      );

      expect(run.result).toMatchObject({
        status: "succeeded",
        outcome: { changedCount: 1 },
      });

      expect(await products().findOne({ _id: "legacy-only" as never })).toEqual(
        { _id: "legacy-only", status: "archived" },
      );

      expect(
        (await cli("verify", "remove-legacy-product-fields")).stdout,
      ).toContain("Verification passed");
    }, 30_000);
  });
});
