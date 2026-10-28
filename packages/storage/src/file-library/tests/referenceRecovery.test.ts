import { describe, expect, it, vi } from "vitest";
import { createFileReferenceCoordinator } from "../createFileReferenceCoordinator.js";
import { createMemoryFileReferenceStore } from "../createMemoryFileReferenceStore.js";
import type { FileReferenceStore } from "../fileReferences.js";
import { createFixture, owner } from "./fileLibraryFixture.js";

const setup = async (
  references: FileReferenceStore = createMemoryFileReferenceStore(),
) => {
  const fixture = createFixture();
  const fileId = await fixture.ready();
  const coordinator = createFileReferenceCoordinator({
    storage: fixture.library,
    references,
    authorize: async (actor, reference) =>
      actor.id === "owner" && reference.consumer.startsWith("matter:"),
  });
  const holds = async () =>
    (await fixture.options.repository.read(owner.tenantId)).files[0].holds;
  return { ...fixture, fileId, coordinator, references, holds };
};

describe("file reference coordination", () => {
  it("binds, detaches and replays idempotently", async () => {
    const { coordinator, fileId, holds } = await setup();
    const input = { referenceId: "ref-1", fileId, consumer: "matter:M-1" };
    const bound = await coordinator.attach(owner, input);
    expect(bound).toMatchObject({ state: "bound", delivered: true });
    expect(await coordinator.attach(owner, input)).toEqual(bound);
    expect((await holds())[0].state).toBe("attached");

    const released = await coordinator.detach(owner, "ref-1");
    expect(released).toMatchObject({ state: "released", delivered: true });
    expect((await holds())[0].state).toBe("released");
    await expect(coordinator.attach(owner, input)).rejects.toThrow(
      "already detached",
    );
  });

  it("recovers an uncertain bind without releasing the hold, then an uncertain detach", async () => {
    const { coordinator, fileId, library, references, holds } = await setup();
    const attach = vi
      .spyOn(library, "attach")
      .mockRejectedValueOnce(new Error("response lost"));
    const input = { referenceId: "ref-1", fileId, consumer: "matter:M-1" };
    await expect(coordinator.attach(owner, input)).rejects.toThrow(
      "response lost",
    );
    expect(await references.pending(owner.tenantId, 10)).toMatchObject([
      { referenceId: "ref-1", state: "bound", delivered: false },
    ]);
    expect((await holds())[0].state).toBe("reserved");

    expect(await coordinator.reconcile(owner, "ref-1")).toMatchObject({
      state: "bound",
      delivered: true,
    });
    attach.mockRestore();

    vi.spyOn(library, "release").mockRejectedValueOnce(new Error("lost"));
    await expect(coordinator.detach(owner, "ref-1")).rejects.toThrow("lost");
    expect((await holds())[0].state).toBe("attached");
    expect(await coordinator.reconcile(owner, "ref-1")).toMatchObject({
      state: "released",
    });
    expect(await references.pending(owner.tenantId, 10)).toEqual([]);
  });

  it("rejects payload changes for an existing reference identity", async () => {
    const { coordinator, fileId } = await setup();
    await coordinator.attach(owner, {
      referenceId: "ref-1",
      fileId,
      consumer: "matter:M-1",
    });
    await expect(
      coordinator.attach(owner, {
        referenceId: "ref-1",
        fileId,
        consumer: "matter:M-2",
      }),
    ).rejects.toThrow("reference identity changed");
  });

  it("prevents a delayed attachment worker from rebinding a detached reference", async () => {
    const { coordinator, fileId, library } = await setup();
    let resume!: () => void;
    const paused = new Promise<void>((resolve) => (resume = resolve));
    const reserve = library.reserve;
    let entered!: () => void;
    const started = new Promise<void>((resolve) => (entered = resolve));
    vi.spyOn(library, "reserve").mockImplementationOnce(async (...args) => {
      entered();
      await paused;
      return reserve(...args);
    });

    const slow = coordinator
      .attach(owner, { referenceId: "ref-1", fileId, consumer: "matter:M-1" })
      .catch((error: unknown) => error);
    await started;
    const detached = coordinator.detach(owner, "ref-1");
    resume();
    await detached;
    await slow;
    expect(await coordinator.reconcile(owner, "ref-1")).toMatchObject({
      state: "released",
    });
  });

  it("denies another actor or an unauthorized consumer", async () => {
    const { coordinator, fileId } = await setup();
    await expect(
      coordinator.attach(owner, {
        referenceId: "ref-1",
        fileId,
        consumer: "billing:1",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await coordinator.attach(owner, {
      referenceId: "ref-2",
      fileId,
      consumer: "matter:M-1",
    });
    await expect(
      coordinator.detach({ id: "reader", tenantId: owner.tenantId }, "ref-2"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
