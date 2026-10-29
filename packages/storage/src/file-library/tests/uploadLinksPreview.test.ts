import { describe, expect, it, vi } from "vitest";
import {
  createFixture,
  owner,
  reader,
  metadata,
  checksumOf,
} from "./fileLibraryFixture";

describe("linked uploads and previews", () => {
  it("creates initial links atomically, retries without duplicates, and binds the target to the intent", async () => {
    const { library, options } = createFixture({
      maxLinksPerType: { matter: 1 },
    });

    const input = metadata({ links: [{ type: "matter", targetId: "a" }] });
    const ticket = await library.begin(owner, input);
    expect(
      (await library.list(owner, { linkedTo: input.links![0] })).items,
    ).toMatchObject([{ id: ticket.file.id, state: "pending" }]);

    expect((await library.begin(owner, input)).file.id).toBe(ticket.file.id);
    expect((await options.repository.read(owner.tenantId)).links).toHaveLength(
      1,
    );

    await expect(
      library.begin(owner, {
        ...input,
        links: [{ type: "matter", targetId: "b" }],
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    await expect(
      library.begin(
        owner,
        metadata({
          links: [
            { type: "matter", targetId: "a" },
            { type: "matter", targetId: "b" },
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    expect((await options.repository.read(owner.tenantId)).files).toHaveLength(
      1,
    );
  });

  it("rejects unauthorized initial links without creating a file", async () => {
    const { library, options } = createFixture({
      authorize: async ({ action }) => action !== "link",
    });

    await expect(
      library.begin(
        owner,
        metadata({ links: [{ type: "matter", targetId: "denied" }] }),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect((await options.repository.read(owner.tenantId)).files).toEqual([]);
  });

  it("previews recognized PDFs inline, reauthorizes and rejects other types or unavailable files", async () => {
    const { library, objects, ready } = createFixture({
      byteValidator: {
        validate: async () => ({ valid: true, typeStatus: "recognized" }),
      },
    });

    const bytes = new TextEncoder().encode("%PDF-1.7 test");

    const ticket = await library.begin(
      owner,
      metadata({
        name: "example.pdf",
        contentType: "application/pdf",
        sizeBytes: bytes.length,
        checksum: checksumOf(bytes),
      }),
    );

    await expect(library.preview(owner, ticket.file.id)).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });

    objects.upload(ticket.upload!.url, bytes);
    await library.finalize(owner, ticket.file.id);
    const signed = vi.spyOn(objects.driver, "download");
    await library.preview(owner, ticket.file.id);
    expect(signed).toHaveBeenLastCalledWith(
      expect.objectContaining({
        disposition: "inline",
        contentType: "application/pdf",
        version: expect.any(String),
      }),
    );

    await expect(library.preview(reader, ticket.file.id)).rejects.toMatchObject(
      { code: "FORBIDDEN" },
    );

    await expect(library.preview(owner, await ready())).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });

    await library.remove(owner, ticket.file.id);
    await expect(library.preview(owner, ticket.file.id)).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
  });
});
