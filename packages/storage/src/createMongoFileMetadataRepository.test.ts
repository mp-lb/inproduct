import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMongoFileMetadataRepository } from "./createMongoFileMetadataRepository";

const url = process.env.INPRODUCT_MONGO_FILE_TEST_URI;

describe.skipIf(!url)("Mongo file metadata repository", () => {
  const client = new MongoClient(url ?? "mongodb://127.0.0.1:27017");

  const db = client.db(
    `inproduct_files_test_${randomUUID().replaceAll("-", "")}`,
  );

  beforeAll(async () => client.connect());
  afterAll(async () => {
    await db.dropDatabase();
    await client.close();
  });

  it("stores one metadata document per file with tenant controls", async () => {
    const repository = createMongoFileMetadataRepository<
      { id: string; tenantId: string; key: string },
      { id: string },
      { quotaBytes?: number }
    >(db, "files");

    expect(await repository.read("tenant-a")).toEqual({
      _id: "tenant-a",
      revision: 0,
      files: [],
      audit: [],
    });

    const first = randomUUID();
    const second = randomUUID();

    const state = {
      _id: "tenant-a",
      revision: 1,
      quotaBytes: 1024,
      files: [
        { id: first, tenantId: "tenant-a", key: `files/${first}` },
        { id: second, tenantId: "tenant-a", key: `files/${second}` },
      ],
      audit: [{ id: "event-1" }],
    };

    expect(await repository.save(state, 0)).toBe(true);
    expect(await repository.read("tenant-a")).toEqual(state);
    expect(await repository.read("tenant-b")).toMatchObject({ files: [] });
    expect(await db.collection("files").countDocuments()).toBe(2);
    expect(await db.collection("filesSettings").countDocuments()).toBe(1);
    expect(
      await db.collection<{ _id: string }>("files").findOne({ _id: first }),
    ).toMatchObject({
      _id: first,
      tenantId: "tenant-a",
      key: `files/${first}`,
    });

    expect(await repository.save({ ...state, revision: 2 }, 0)).toBe(false);
  });
});
