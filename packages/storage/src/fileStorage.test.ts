import { describe, expect, it, vi } from "vitest";
import { createFileStorage, createMemoryFileStorageAdapter } from ".";

const upload = {
  name: "notes.txt",
  body: new Uint8Array([1, 2]),
  tags: ["demo"],
};

describe("file storage", () => {
  it("uploads, filters, paginates, edits, downloads and deletes with accurate usage", async () => {
    const storage = createFileStorage();
    const first = await storage.upload(upload);

    const second = await storage.upload({
      ...upload,
      name: "image.png",
    });

    const page = await storage.list({ limit: 1 });
    expect(page.items.map((file) => file.id)).toEqual([second.id]);
    expect(page).toMatchObject({
      total: 2,
      nextOffset: 1,
      usage: { count: 2, bytes: 4 },
    });

    expect((await storage.list({ offset: 1, limit: 1 })).items[0]?.id).toBe(
      first.id,
    );

    expect(
      (await storage.list({ search: "NOTES", tag: "demo" })).items,
    ).toHaveLength(1);

    expect((await storage.list({ tag: "missing" })).items).toHaveLength(0);
    await storage.edit(first.id, {
      name: " renamed.txt ",

      tags: [" one ", "one", ""],
    });

    expect((await storage.list({ tag: "one" })).items[0]).toMatchObject({
      name: "renamed.txt",
      tags: ["one"],
    });

    expect(await storage.download(first.id)).toMatchObject({
      body: upload.body,
      name: "renamed.txt",
    });

    await storage.remove(first.id);
    await storage.remove(first.id);
    expect((await storage.list()).usage).toEqual({ count: 1, bytes: 2 });
    await expect(storage.download(first.id)).rejects.toThrow("file not found");
    await expect(
      storage.edit(first.id, { name: "gone", tags: [] }),
    ).rejects.toThrow("file not found");
  });

  it("isolates bytes and metadata, including across facades sharing an adapter", async () => {
    const adapter = createMemoryFileStorageAdapter();
    const storage = createFileStorage({ adapter });
    const body = new Uint8Array([7]);
    const tags = ["original"];
    const file = await storage.upload({ name: "a", body, tags });
    body[0] = 9;
    tags[0] = "changed";
    file.tags[0] = "changed";
    const read = await storage.download(file.id);
    read.body[0] = 8;
    const page = await storage.list();
    page.items[0]!.tags[0] = "changed";
    expect(
      (await createFileStorage({ adapter }).list()).items[0]?.tags,
    ).toEqual(["original"]);

    expect((await storage.download(file.id)).body[0]).toBe(7);
    expect((await createFileStorage().list()).total).toBe(0);
  });

  it("rejects invalid metadata, page bounds and oversized files without writes", async () => {
    const adapter = createMemoryFileStorageAdapter();
    const insert = vi.spyOn(adapter, "insert");
    const storage = createFileStorage({ adapter, maxBytes: 1 });
    await expect(storage.upload(upload)).rejects.toThrow("byte limit");

    for (const name of ["", "../secret", "a\\b", "x\n", "a".repeat(256)]) {
      await expect(
        storage.upload({ name, body: new Uint8Array() }),
      ).rejects.toThrow();
    }

    await expect(
      storage.upload({
        name: "ok",
        tags: ["x".repeat(81)],
        body: new Uint8Array(),
      }),
    ).rejects.toThrow();

    await expect(storage.list({ limit: 0 })).rejects.toThrow();
    await expect(storage.list({ offset: -1 })).rejects.toThrow();
    expect(insert).not.toHaveBeenCalled();
    expect(() => createFileStorage({ maxBytes: -1 })).toThrow();
    await createFileStorage({ maxBytes: 0 }).upload({
      name: "empty",
      body: new Uint8Array(),
    });
  });

  it("propagates adapter failures and never reports a failed write as successful", async () => {
    const adapter = createMemoryFileStorageAdapter();
    const error = new Error("unavailable");
    vi.spyOn(adapter, "insert").mockRejectedValue(error);
    await expect(createFileStorage({ adapter }).upload(upload)).rejects.toBe(
      error,
    );

    expect((await createFileStorage({ adapter }).list()).total).toBe(0);
  });
});
