import { Buffer } from "node:buffer";
import { describe, expect, it, vi } from "vitest";
import { createMemoryStorageAdapter, createStorage } from ".";

const object = { body: new Uint8Array([1, 2]), contentType: "image/png" };

describe("storage", () => {
  it("roundtrips bytes and metadata, replaces objects, and deletes idempotently", async () => {
    const storage = createStorage({ adapter: createMemoryStorageAdapter() });
    expect(await storage.get("missing")).toBeUndefined();
    await storage.put("images/a", object);
    expect(await storage.get("images/a")).toEqual(object);
    await storage.put("images/a", { body: new Uint8Array() });
    expect(await storage.get("images/a")).toEqual({ body: new Uint8Array() });
    await storage.delete("images/a");
    await storage.delete("images/a");
    expect(await storage.get("images/a")).toBeUndefined();
  });

  it("isolates namespaces and snapshots options", async () => {
    const adapter = createMemoryStorageAdapter();
    const options = { adapter, prefix: "one", maxBytes: 2 };
    const first = createStorage(options);
    const second = createStorage({ adapter, prefix: "two" });
    options.prefix = "two";
    options.maxBytes = 0;
    await first.put("a", object);
    expect(await adapter.get("one/a")).toEqual(object);
    expect(await second.get("a")).toBeUndefined();
    await second.delete("a");
    expect(await first.get("a")).toEqual(object);
    await first.delete("a");
    expect(await adapter.get("one/a")).toBeUndefined();
  });

  it.each([new Uint8Array([1, 2]), Buffer.from([1, 2])])(
    "copies input and output bytes",
    async (body) => {
      const adapter = createMemoryStorageAdapter();
      const input = { body, contentType: "text/plain" };
      await adapter.put("a", input);
      body[0] = 9;
      input.contentType = "changed";
      const read = await adapter.get("a");
      expect(read).toEqual({
        body: new Uint8Array([1, 2]),
        contentType: "text/plain",
      });

      if (!read) throw new Error("expected object");
      read.body[0] = 8;
      read.contentType = "changed";
      expect(await adapter.get("a")).toEqual({
        body: new Uint8Array([1, 2]),
        contentType: "text/plain",
      });

      expect(await createMemoryStorageAdapter().get("a")).toBeUndefined();
    },
  );

  it.each([
    "",
    "/a",
    "a/",
    "a//b",
    ".",
    "..",
    "a/../b",
    "a/./b",
    "a\\b",
    "a\u0000b",
    "a\nb",
  ])("rejects invalid key %j before invoking adapters", async (key) => {
    const adapter = { put: vi.fn(), get: vi.fn(), delete: vi.fn() };
    const storage = createStorage({ adapter });
    await expect(storage.put(key, object)).rejects.toThrow(TypeError);
    await expect(storage.get(key)).rejects.toThrow(TypeError);
    await expect(storage.delete(key)).rejects.toThrow(TypeError);
    expect(adapter.put).not.toHaveBeenCalled();
    expect(adapter.get).not.toHaveBeenCalled();
    expect(adapter.delete).not.toHaveBeenCalled();
    expect(() => createStorage({ adapter, prefix: key })).toThrow(TypeError);
  });

  it("preserves literal Unicode and percent escapes", async () => {
    const storage = createStorage({ adapter: createMemoryStorageAdapter() });
    await storage.put("文/%2e%2e", object);
    expect(await storage.get("文/%2e%2e")).toEqual(object);
  });

  it.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid size limit %j",
    (maxBytes) => {
      expect(() =>
        createStorage({ adapter: createMemoryStorageAdapter(), maxBytes }),
      ).toThrow(RangeError);
    },
  );

  it("enforces byte limits before writes, including zero", async () => {
    const adapter = createMemoryStorageAdapter();
    const storage = createStorage({ adapter, maxBytes: 2 });
    await storage.put("a", object);
    await expect(storage.put("a", { body: new Uint8Array(3) })).rejects.toThrow(
      RangeError,
    );

    expect(await storage.get("a")).toEqual(object);
    const empty = createStorage({ adapter, maxBytes: 0 });
    await empty.put("empty", { body: new Uint8Array() });
    await expect(empty.put("a", object)).rejects.toThrow(RangeError);
  });

  it("propagates operational failures unchanged", async () => {
    const error = new Error("backend unavailable");
    const fail = vi.fn().mockRejectedValue(error);

    const storage = createStorage({
      adapter: { put: fail, get: fail, delete: fail },
    });

    await expect(storage.put("a", object)).rejects.toBe(error);
    await expect(storage.get("a")).rejects.toBe(error);
    await expect(storage.delete("a")).rejects.toBe(error);
  });
});
