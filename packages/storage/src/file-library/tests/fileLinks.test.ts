import { describe, expect, it } from "vitest";
import { createFixture, owner, reader } from "./fileLibraryFixture";

describe("file links", () => {
  it("links many targets, filters files, and unlinks idempotently without holds", async () => {
    const { library, ready, options } = createFixture();
    const fileId = await ready();
    const link = { fileId, type: "project", targetId: "a" };
    await library.link(owner, link);
    await library.link(owner, link);
    await library.link(owner, { ...link, targetId: "b" });
    expect(
      (
        await library.list(owner, {
          linkedTo: { type: "project", targetId: "a" },
        })
      ).items,
    ).toMatchObject([
      {
        id: fileId,
        holdCount: 0,
        links: [
          { type: "project", targetId: "a" },
          { type: "project", targetId: "b" },
        ],
      },
    ]);

    await library.unlink(owner, link);
    await library.unlink(owner, link);
    expect(
      (
        await library.list(owner, {
          linkedTo: { type: "project", targetId: "a" },
        })
      ).items,
    ).toEqual([]);

    const partition = await options.repository.read(owner.tenantId);
    expect(
      partition.audit.filter((event) => event.eventType === "file.linked"),
    ).toHaveLength(2);

    expect(partition.audit.at(-1)?.details.link).toEqual({
      type: "project",
      targetId: "a",
    });

    await expect(library.remove(owner, fileId)).resolves.toMatchObject({
      state: "deleted",
    });
  });

  it("enforces per-type cardinality atomically, while allowing other types", async () => {
    const { library, ready } = createFixture({
      maxLinksPerType: { matter: 1 },
    });

    const fileId = await ready();

    const results = await Promise.allSettled(
      ["a", "b"].map((targetId) =>
        library.link(owner, { fileId, type: "matter", targetId }),
      ),
    );

    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);

    await library.link(owner, { fileId, type: "email", targetId: "c" });
    const file = (await library.list(owner, {})).items[0];
    expect(file.links?.filter((link) => link.type === "matter")).toHaveLength(
      1,
    );

    const matter = file.links!.find((link) => link.type === "matter")!;
    await library.unlink(owner, { fileId, ...matter });
    await library.link(owner, { fileId, type: "matter", targetId: "d" });
  });

  it("enforces file and target authorization and tenant isolation", async () => {
    const { library, ready } = createFixture({
      authorize: async ({ actor, link }) =>
        actor.id === owner.id && link?.targetId !== "denied",
    });

    const fileId = await ready();
    const link = { fileId, type: "matter", targetId: "a" };
    await expect(library.link(reader, link)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    await expect(
      library.link(owner, { ...link, targetId: "denied" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(
      library.link({ ...owner, tenantId: "other" }, link),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await library.link(owner, link);
    expect((await library.list(reader, {})).items).toEqual([]);
    await expect(library.unlink(reader, link)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    await library.remove(owner, fileId);
    await expect(
      library.link(owner, { ...link, targetId: "b" }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });

    await library.unlink(owner, link);
  });
});
