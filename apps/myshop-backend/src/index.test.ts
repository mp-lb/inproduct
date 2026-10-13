import { request, type Server } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createFileStorageClient } from "@mp-lb/inproduct-storage";
import { createMyShopBackend } from "./createMyShopBackend";

const listen = async (server: Server) => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("expected TCP address");
  return `http://127.0.0.1:${address.port}`;
};

describe("MyShop backend", () => {
  it("serves the library API with durable bytes and rejects other browser origins", async () => {
    const directory = await mkdtemp(join(tmpdir(), "myshop-backend-"));
    const frontendOrigin = "http://localhost";
    const server = createMyShopBackend({ directory, frontendOrigin });
    const base = await listen(server);

    try {
      expect(await (await fetch(`${base}/health`)).json()).toEqual({
        ok: true,
        service: "myshop-backend",
      });

      const client = createFileStorageClient(`${base}/api/files`, {
        fetch: (url, init) =>
          fetch(url, {
            ...init,
            headers: { ...init?.headers, origin: frontendOrigin },
          }),
      });

      const file = await client.upload({
        name: "example.txt",
        body: new TextEncoder().encode("MyShop backend"),
      });

      expect(
        new TextDecoder().decode((await client.download(file.id)).body),
      ).toBe("MyShop backend");

      expect(
        (
          await fetch(`${base}/api/files`, {
            headers: { origin: "https://other.example" },
          })
        ).status,
      ).toBe(403);

      const foreignHostStatus = await new Promise<number | undefined>(
        (resolve, reject) => {
          const probe = request(
            `${base}/api/files`,
            { headers: { host: "other.example" } },
            (response) => {
              response.resume();
              response.on("end", () => resolve(response.statusCode));
            },
          );

          probe.on("error", reject);
          probe.end();
        },
      );

      expect(foreignHostStatus).toBe(403);

      expect(
        (
          await fetch(`${base}/api/files`, {
            headers: { "sec-fetch-site": "cross-site" },
          })
        ).status,
      ).toBe(403);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );

      await rm(directory, { recursive: true, force: true });
    }
  });
});
