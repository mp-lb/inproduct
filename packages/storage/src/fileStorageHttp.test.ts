import { createServer, type Server, type IncomingMessage } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createFileStorage } from "./createFileStorage";
import { createFileStorageClient } from "./createFileStorageClient";
import { createFileStorageHandler } from "./createFileStorageHandler";
import { createDiskFileStorageAdapter } from "./createDiskFileStorageAdapter";

const listen = async (server: Server) => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("expected TCP address");
  return `http://127.0.0.1:${address.port}/api/files`;
};

const close = async (server: Server) => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
};

describe("file API and durable storage", () => {
  it("roundtrips real HTTP bytes and metadata, survives a backend restart, filters and deletes", async () => {
    const directory = await mkdtemp(join(tmpdir(), "inproduct-files-"));

    const start = () =>
      createServer(
        createFileStorageHandler({
          storage: createFileStorage({
            adapter: createDiskFileStorageAdapter({ directory }),
          }),
          authorize: () => true,
        }),
      );

    let server = start();

    try {
      const first = createFileStorageClient(await listen(server));
      const bytes = new Uint8Array([0, 1, 255, 127]);

      const file = await first.upload({
        name: "receipt.txt",
        body: bytes,
        contentType: "text/plain",
        category: "admin",
        tags: ["receipt"],
      });

      await first.edit(file.id, {
        name: "注文.txt",
        category: "orders",
        tags: ["order"],
      });

      await close(server);
      server = start();
      const second = createFileStorageClient(await listen(server));

      const page = await second.list({
        category: "orders",
        tag: "order",
        search: "注文",
      });

      expect(page).toMatchObject({ total: 1, usage: { count: 1, bytes: 4 } });
      expect(page.items[0]).toMatchObject({
        id: file.id,
        name: "注文.txt",
        contentType: "text/plain",
      });

      expect(await second.download(file.id)).toMatchObject({
        name: "注文.txt",
        body: bytes,
        contentType: "text/plain",
      });

      await second.remove(file.id);
      await second.remove(file.id);
      expect((await second.list()).total).toBe(0);
      await expect(second.download(file.id)).rejects.toThrow("file not found");
    } finally {
      await close(server);
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("authorizes every action and never leaks unexpected errors", async () => {
    const storage = createFileStorage();
    const onError = vi.fn();

    const authorize = vi.fn(
      (request: IncomingMessage) =>
        request.headers.authorization === "Bearer local-test",
    );

    const server = createServer(
      createFileStorageHandler({ storage, authorize, onError }),
    );

    const base = await listen(server);

    try {
      for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
        const response = await fetch(base, { method });
        expect(response.status).toBe(403);
      }

      expect(authorize).toHaveBeenCalledTimes(4);
      vi.spyOn(storage, "list").mockRejectedValue(
        new Error("private disk path and credentials"),
      );

      const response = await fetch(base, {
        headers: { authorization: "Bearer local-test" },
      });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "file operation failed" });
      expect(onError).toHaveBeenCalledOnce();
    } finally {
      await close(server);
    }
  });

  it("rejects invalid requests, oversized bodies and invalid metadata without changing data", async () => {
    const storage = createFileStorage({ maxBytes: 1 });

    const server = createServer(
      createFileStorageHandler({
        storage,
        authorize: () => true,
        maxRequestBytes: 2048,
      }),
    );

    const base = await listen(server);
    const client = createFileStorageClient(base);

    try {
      expect((await fetch(`${base}?offset=-1`)).status).toBe(400);
      expect((await fetch(`${base}?limit=1000`)).status).toBe(400);
      expect(
        (await fetch(base, { method: "POST", body: "bad multipart" })).status,
      ).toBe(400);

      expect(
        (await fetch(base, { method: "POST", body: "x".repeat(2049) })).status,
      ).toBe(413);

      await expect(
        client.upload({ name: "large", body: new Uint8Array(2) }),
      ).rejects.toThrow("byte limit");

      expect((await client.list()).usage.count).toBe(0);

      const file = await client.upload({
        name: "tiny",
        body: new Uint8Array([9]),
      });

      await expect(
        client.edit(file.id, {
          name: "../secret",
          category: "general",
          tags: [],
        }),
      ).rejects.toThrow("file name");

      expect((await client.download(file.id)).body).toEqual(
        new Uint8Array([9]),
      );
    } finally {
      await close(server);
    }
  });

  it("confines disk paths and serializes deletion against metadata edits", async () => {
    const directory = await mkdtemp(join(tmpdir(), "inproduct-files-"));

    try {
      const storage = createFileStorage({
        adapter: createDiskFileStorageAdapter({ directory }),
      });

      await expect(storage.download("../outside")).rejects.toThrow(
        "file not found",
      );

      const file = await storage.upload({
        name: "keep",
        body: new Uint8Array([1]),
      });

      const deleted = storage.remove(file.id);

      const edit = storage.edit(file.id, {
        name: "changed",
        category: "general",
        tags: [],
      });

      await deleted;
      await expect(edit).rejects.toThrow("file not found");
      expect((await storage.list()).total).toBe(0);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
