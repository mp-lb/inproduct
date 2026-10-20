import { MongoClient } from "mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createFileStorage } from "./createFileStorage";
import { createMongoFileStorageAdapter } from "./createMongoFileStorageAdapter";
import { createMongoStorageAdapter } from "./createMongoStorageAdapter";
import { createStorage } from "./createStorage";

const uri = process.env.INPRODUCT_MONGO_TEST_URI;

describe.skipIf(!uri)("MongoDB adapters", () => {
  const client = new MongoClient(uri ?? "mongodb://127.0.0.1:27017");
  const databaseName = `inproduct_storage_test_${crypto.randomUUID().replaceAll("-", "")}`;
  const db = client.db(databaseName);

  beforeAll(async () => client.connect());
  afterAll(async () => {
    await db.dropDatabase();
    await client.close();
  });

  it("persists object replacement, copies bytes and deletes idempotently", async () => {
    const storage = createStorage({
      adapter: createMongoStorageAdapter(db, "objects"),
      prefix: "tenant-a",
    });

    const bytes = new Uint8Array([1, 2]);
    await storage.put("one", { body: bytes, contentType: "text/plain" });
    bytes[0] = 9;
    expect(await storage.get("one")).toEqual({
      body: new Uint8Array([1, 2]),
      contentType: "text/plain",
    });

    await storage.put("one", { body: new Uint8Array([3]) });
    expect(await storage.get("one")).toEqual({ body: new Uint8Array([3]) });
    expect(await db.collection("objects").countDocuments()).toBe(1);
    await storage.delete("one");
    await storage.delete("one");
    expect(await storage.get("one")).toBeUndefined();
  });

  it("persists files, filters literal search, and preserves usage across adapters", async () => {
    const storage = createFileStorage({
      adapter: createMongoFileStorageAdapter(db, "files"),
    });

    const first = await storage.upload({
      name: "report[1].txt",
      body: new Uint8Array([1, 2]),
      category: "admin",
      tags: ["billing"],
    });

    await storage.upload({
      name: "report2.txt",
      body: new Uint8Array([3]),
      category: "user",
    });

    const fresh = createFileStorage({
      adapter: createMongoFileStorageAdapter(db, "files"),
    });

    expect(
      (await fresh.list({ search: "[1]" })).items.map((file) => file.id),
    ).toEqual([first.id]);

    expect(
      (await fresh.list({ category: "admin", tag: "billing" })).total,
    ).toBe(1);

    expect((await fresh.list({ search: "none" })).usage).toEqual({
      count: 2,
      bytes: 3,
    });

    await fresh.edit(first.id, {
      name: "updated",
      category: "admin",
      tags: [],
    });

    expect((await storage.download(first.id)).body).toEqual(
      new Uint8Array([1, 2]),
    );

    await storage.remove(first.id);
    await storage.remove(first.id);
    expect((await fresh.list()).usage).toEqual({ count: 1, bytes: 1 });
    await expect(
      fresh.edit(first.id, { name: "gone", category: "admin", tags: [] }),
    ).rejects.toThrow("file not found");
  });
});
