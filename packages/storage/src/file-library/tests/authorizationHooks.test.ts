import { describe, expect, it, vi } from "vitest";
import type { AuthorizeFileAction } from "../fileLibraryContracts";
import {
  createFixture,
  metadata,
  owner,
  ownerPolicy,
  reader,
} from "./fileLibraryFixture";

describe("file library authorization hooks", () => {
  it("asks the host for each exact action with file, scope, category and consumer context", async () => {
    const authorize = vi.fn<AuthorizeFileAction>(ownerPolicy);
    const { library, objects } = createFixture({ authorize });
    const input = metadata({ scope: "admin:files", category: "admin" });
    const ticket = await library.begin(owner, input);
    expect(authorize).toHaveBeenCalledWith({
      actor: owner,
      action: "upload",
      ...input,
    });

    objects.upload(
      ticket.upload!.url,
      new TextEncoder().encode("Synthetic test document"),
    );

    await library.finalize(owner, ticket.file.id);
    await library.reserve(owner, ticket.file.id, "hold-1", "matter:M-1");
    await library.download(owner, ticket.file.id);

    const actions = authorize.mock.calls.map(([call]) => call.action);
    expect(actions).toEqual(
      expect.arrayContaining(["upload", "write", "attach", "download"]),
    );

    expect(
      authorize.mock.calls.find(([call]) => call.consumer)?.[0],
    ).toMatchObject({
      action: "attach",
      consumer: "matter:M-1",
      file: expect.objectContaining({ id: ticket.file.id }),
    });
  });

  it("filters permissions before pagination and hides cross-tenant UUIDs", async () => {
    const { library, ready } = createFixture();
    const id = await ready();
    expect((await library.list(reader, { limit: 1 })).items).toEqual([]);
    await expect(library.download(reader, id)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    await expect(
      library.download({ ...owner, tenantId: "tenant-b" }, id),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("fills authorized pages without exposing hidden rows through cursors", async () => {
    const authorize: AuthorizeFileAction = async ({ action, file }) =>
      action !== "read" || !file?.name.startsWith("hidden");

    const { library } = createFixture({ authorize, quotaBytes: 10_000 });
    for (const name of [
      "a.txt",
      "hidden.txt",
      "b.txt",
      "hidden-2.txt",
      "c.txt",
    ])
      await library.begin(owner, metadata({ name }));

    const first = await library.list(owner, { limit: 2 });

    const second = await library.list(owner, {
      limit: 2,
      cursor: first.nextCursor!,
    });

    expect(first.items).toHaveLength(2);
    expect(second.items).toHaveLength(1);
    expect(second.nextCursor).toBeNull();
    expect(
      [...first.items, ...second.items].map((file) => file.name).sort(),
    ).toEqual(["a.txt", "b.txt", "c.txt"]);
  });

  it("requires explicit diagnostics and configure grants", async () => {
    const { library, ready } = createFixture({
      authorize: async ({ action }) =>
        action !== "diagnostics" && action !== "configure",
    });

    await ready();
    await expect(library.diagnostics(owner)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    await expect(
      library.setQuota(owner, { quotaBytes: 1 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects untrusted actor identities before consulting the host", async () => {
    const authorize = vi.fn<AuthorizeFileAction>(async () => true);
    const { library } = createFixture({ authorize });
    await expect(
      library.begin({ id: "", tenantId: "tenant-a" }, metadata()),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(authorize).not.toHaveBeenCalled();
  });

  it("denies consumer grants the host does not allow", async () => {
    const { library, ready } = createFixture();
    const id = await ready();
    await expect(
      library.reserve(owner, id, "hold-1", "billing:invoice-1"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
