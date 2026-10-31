import { MongoClient, type Collection, type Document } from "mongodb";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createRemoveFieldsJob } from "../remove-fields/createRemoveFieldsJob";
import { createDataJobRunner } from "../runner/createDataJobRunner";

const uri = process.env.INPRODUCT_MONGO_TEST_URI;

const runConfirmed = async (
  runner: ReturnType<typeof createDataJobRunner>,
  id: string,
) =>
  runner.run({
    id,
    confirmationToken: (await runner.inspect(id)).confirmationToken,
    acceptDataLoss: true,
  });

describe.skipIf(!uri)("Remove fields on MongoDB", () => {
  const client = new MongoClient(uri ?? "mongodb://127.0.0.1:27017");

  const db = client.db(
    `inproduct_data_jobs_test_${crypto.randomUUID().replaceAll("-", "")}`,
  );

  let products: Collection<Document>;

  beforeAll(async () => client.connect());
  afterAll(async () => {
    await db.dropDatabase();
    await client.close();
  });

  beforeEach(async () => {
    products = db.collection(`products_${crypto.randomUUID().slice(0, 8)}`);
    // Legacy shapes on purpose: mixed types and fields no current schema would accept.
    await products.insertMany([
      {
        _id: 1 as never,
        status: "archived",
        name: "Mug",
        legacyPrice: "12",
        internal: { notes: "old", keep: true },
      },
      { _id: 2 as never, status: "archived", name: "Bowl", legacyPrice: null },
      {
        _id: 3 as never,
        status: "active",
        name: "Plate",
        legacyPrice: 9,
        internal: { notes: "keep me" },
      },
      {
        _id: 4 as never,
        status: "archived",
        name: "Cup",
        internal: [{ notes: "in array" }],
      },
      { _id: 5 as never, status: "archived", name: "Tray" },
    ]);
  });

  const createJob = (collection = products, batchSize = 1) =>
    createRemoveFieldsJob({
      id: "remove-legacy-fields",
      title: "Remove legacy fields",
      description: "Removes legacy pricing and notes from archived products.",
      collection,
      fields: ["legacyPrice", "internal.notes"],
      filter: { status: "archived" },
      batchSize,
    });

  it("inspects scoped documents and reports array-reached fields as blocked", async () => {
    const runner = createDataJobRunner({ jobs: [createJob()] });
    const { inspection, job } = await runner.inspect("remove-legacy-fields");
    expect(job).toMatchObject({
      destructive: true,
      retryPolicy: "safe_to_rerun",
      rerunSupported: true,
    });

    expect(job.scope).toContain(products.collectionName);
    expect(inspection).toMatchObject({
      matchedCount: 2,
      changes: [
        { label: "Remove legacyPrice", count: 2 },
        { label: "Remove internal.notes", count: 1 },
      ],
    });

    expect(inspection.warnings).toEqual([
      expect.stringContaining(
        "1 documents reach internal.notes through an array",
      ),
    ]);
  });

  it("removes only the scoped fields, preserves other data and reruns safely", async () => {
    const runner = createDataJobRunner({ jobs: [createJob(products, 1)] });
    const progress: number[] = [];
    const preview = await runner.inspect("remove-legacy-fields");

    const first = await runner.run(
      {
        id: "remove-legacy-fields",
        confirmationToken: preview.confirmationToken,
        acceptDataLoss: true,
      },
      (value) => progress.push(value.completed),
    );

    // Document 4 keeps its array-reached field, so verification honestly fails.
    expect(first).toMatchObject({
      status: "failed",
      outcome: { changedCount: 2, skippedCount: 2 },
      verification: { passed: false, remainingCount: 1 },
      rerunSupported: true,
    });

    expect(first.outcome?.changes).toEqual([
      { label: "Removed legacyPrice", count: 2 },
      { label: "Removed internal.notes", count: 1 },
    ]);

    expect(progress).toEqual([0, 1, 2]);
    expect(await products.find().sort({ _id: 1 }).toArray()).toEqual([
      { _id: 1, status: "archived", name: "Mug", internal: { keep: true } },
      { _id: 2, status: "archived", name: "Bowl" },
      {
        _id: 3,
        status: "active",
        name: "Plate",
        legacyPrice: 9,
        internal: { notes: "keep me" },
      },
      {
        _id: 4,
        status: "archived",
        name: "Cup",
        internal: [{ notes: "in array" }],
      },
      { _id: 5, status: "archived", name: "Tray" },
    ]);

    const second = await runConfirmed(runner, "remove-legacy-fields");
    expect(second).toMatchObject({
      outcome: {
        changedCount: 0,
        summary: "Fields were already removed. Nothing changed.",
      },
    });

    // Once the operator repairs the array document manually, the same job verifies.
    await products.updateOne({ _id: 4 as never }, { $unset: { internal: "" } });
    expect(await runConfirmed(runner, "remove-legacy-fields")).toMatchObject({
      status: "succeeded",
      verification: { passed: true, remainingCount: 0 },
    });
  });

  it("succeeds on clean scopes without touching documents", async () => {
    const job = createRemoveFieldsJob({
      id: "remove-top-level",
      title: "Remove legacy price",
      description: "Removes legacy pricing.",
      collection: products,
      fields: ["legacyPrice"],
      filter: { status: "archived" },
    });

    const runner = createDataJobRunner({ jobs: [job] });
    expect(await runConfirmed(runner, job.id)).toMatchObject({
      status: "succeeded",
      outcome: { changedCount: 2 },
    });

    expect(await runConfirmed(runner, job.id)).toMatchObject({
      status: "succeeded",
      outcome: { changedCount: 0 },
    });

    expect(await products.countDocuments({ legacyPrice: 9 })).toBe(1);
  });

  it("reports a database failure part way through and recovers on rerun", async () => {
    let updates = 0;

    const flaky = new Proxy(products, {
      get: (target, property, receiver) =>
        property === "updateMany"
          ? (...args: Parameters<Collection<Document>["updateMany"]>) => {
              if (++updates === 3)
                return Promise.reject(new Error("connection reset"));
              return target.updateMany(...args);
            }
          : Reflect.get(target, property, receiver),
    });

    const runner = createDataJobRunner({ jobs: [createJob(flaky, 1)] });
    expect(await runConfirmed(runner, "remove-legacy-fields")).toMatchObject({
      status: "failed",
      error: "connection reset",
      progress: { completed: 1, total: 2 },
      rerunSupported: true,
    });

    expect(
      await products.countDocuments({
        legacyPrice: { $exists: true },
        status: "archived",
      }),
    ).toBe(1);

    await runConfirmed(runner, "remove-legacy-fields");
    expect(
      await products.countDocuments({
        legacyPrice: { $exists: true },
        status: "archived",
      }),
    ).toBe(0);
  });

  it("rejects invalid configuration before touching the database", () => {
    expect(() =>
      createRemoveFieldsJob({
        ...baseOptions(products),
        fields: ["items.0.name"],
      }),
    ).toThrow("array index");

    expect(() =>
      createRemoveFieldsJob({ ...baseOptions(products), fields: [] }),
    ).toThrow("at least one");

    expect(() =>
      createRemoveFieldsJob({ ...baseOptions(products), batchSize: 0 }),
    ).toThrow("batch size");
  });
});

const baseOptions = (collection: Collection<Document>) => ({
  id: "invalid-job",
  title: "Invalid",
  description: "Invalid configuration.",
  collection,
  fields: ["legacyPrice"],
});
