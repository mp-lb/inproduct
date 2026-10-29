import { describe, expect, it } from "vitest";
import { createFileStorage } from "./createFileStorage";
import { createFileStorageTRPCClient } from "./createFileStorageTRPCClient";

describe("createFileStorageTRPCClient", () => {
  it("round-trips binary files through a host tRPC proxy", async () => {
    const storage = createFileStorage();

    const router = {
      list: {
        query: (query: Parameters<typeof storage.list>[0]) =>
          storage.list(query),
      },
      upload: {
        mutate: (input: {
          name: string;

          tags: string[];
          contentType: string;
          base64: string;
        }) =>
          storage.upload({
            ...input,
            body: Uint8Array.from(atob(input.base64), (value) =>
              value.charCodeAt(0),
            ),
          }),
      },
      edit: {
        mutate: (input: {
          id: string;
          name: string;

          tags: string[];
        }) => storage.edit(input.id, input),
      },
      remove: { mutate: (input: { id: string }) => storage.remove(input.id) },
      download: {
        mutate: async (input: { id: string }) => {
          const file = await storage.download(input.id);
          return {
            name: file.name,
            contentType: file.contentType,
            base64: btoa(String.fromCharCode(...file.body)),
          };
        },
      },
    };

    const client = createFileStorageTRPCClient(router);
    const bytes = new Uint8Array(80_000);
    for (let index = 0; index < bytes.length; index++)
      bytes[index] = index % 256;

    const uploaded = await client.upload({ name: "binary.bin", body: bytes });
    expect(uploaded).not.toHaveProperty("category");
    expect((await client.download(uploaded.id)).body).toEqual(bytes);
    expect((await client.list()).usage.bytes).toBe(bytes.length);
    expect(
      (
        await client.edit(uploaded.id, {
          name: "renamed.bin",

          tags: [],
        })
      ).name,
    ).toBe("renamed.bin");

    await client.remove(uploaded.id);
    expect((await client.list()).total).toBe(0);
  });
});
