import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMongoFileLibraryRepository } from "../../createMongoFileLibraryRepository";
import { createMongoFileAuditLedger } from "../../createMongoFileAuditLedger";
import { createMongoFileReferenceStore } from "../../createMongoFileReferenceStore";
import { createFileAuditDispatcher } from "../createFileAuditDispatcher";
import { createFileReferenceCoordinator } from "../createFileReferenceCoordinator";
import { bytes, createFixture, metadata, owner } from "./fileLibraryFixture";

const url = process.env.INPRODUCT_MONGO_FILE_TEST_URI;

// Requires a replica set: the repository uses snapshot transactions.
describe.skipIf(!url)("file library on MongoDB", () => {
  const client = new MongoClient(url ?? "mongodb://127.0.0.1:27017");

  const db = client.db(
    `inproduct_library_test_${randomUUID().replaceAll("-", "")}`,
  );

  beforeAll(async () => client.connect());
  afterAll(async () => {
    await db.dropDatabase();
    await client.close();
  });

  const fixture = (collection: string, quotaBytes = 1000) =>
    createFixture({
      repository: createMongoFileLibraryRepository(db, collection),
      quotaBytes,
    });

  it("deduplicates concurrent retries and serializes quota through transactions", async () => {
    const { library } = fixture("quotaFiles", bytes.byteLength * 2);
    const input = metadata();

    const retries = await Promise.all([
      library.begin(owner, input),
      library.begin(owner, input),
      library.begin(owner, input),
    ]);

    expect(new Set(retries.map((ticket) => ticket.file.id)).size).toBe(1);

    const racers = await Promise.allSettled(
      Array.from({ length: 4 }, () => library.begin(owner, metadata())),
    );

    expect(racers.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.collection("quotaFiles").countDocuments()).toBe(2);
    expect((await library.diagnostics(owner)).reservedBytes).toBe(
      bytes.byteLength * 2,
    );
  });

  it("keeps version pins and stores each file in the host-chosen collection", async () => {
    const { library, ready } = fixture("hostFiles");
    const id = await ready();

    const document = await db
      .collection("hostFiles")
      .findOne({ _id: id as never });

    expect(document).toMatchObject({
      tenantId: owner.tenantId,
      state: "available",
    });

    expect(document?.version).toBeTruthy();
    expect(await db.collection("hostFilesSettings").countDocuments()).toBe(1);
    expect((await library.download(owner, id)).url).toContain("base64");
  });

  it("delivers audit idempotently to a host-named ledger collection", async () => {
    const { options, ready } = fixture("auditFiles");
    await ready();
    const ledger = createMongoFileAuditLedger(db, "hostAudit");
    const dispatch = createFileAuditDispatcher(options.repository, ledger);
    const pending = (await options.repository.read(owner.tenantId)).audit;
    await ledger.append(owner.tenantId, pending);
    expect(await dispatch(owner.tenantId)).toBe(pending.length);
    expect(await db.collection("hostAudit").countDocuments()).toBe(
      pending.length,
    );

    expect((await options.repository.read(owner.tenantId)).audit).toEqual([]);
  });

  it("coordinates references through a host-named Mongo reference store", async () => {
    const { library, ready } = fixture("referenceFiles");
    const fileId = await ready();
    const references = createMongoFileReferenceStore(db, "hostReferences");

    const coordinator = createFileReferenceCoordinator({
      storage: library,
      references,
      authorize: async () => true,
    });

    const bound = await coordinator.attach(owner, {
      referenceId: "ref-1",
      fileId,
      consumer: "matter:M-1",
    });

    expect(bound).not.toHaveProperty("_id");
    expect(await references.pending(owner.tenantId, 5)).toEqual([]);
    expect(await coordinator.detach(owner, "ref-1")).toMatchObject({
      state: "released",
    });

    expect(await db.collection("hostReferences").countDocuments()).toBe(1);
  });
});
