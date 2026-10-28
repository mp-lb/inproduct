import { describe, expect, it } from "vitest";
import { createFixture, owner } from "./fileLibraryFixture";

describe("file library retention holds", () => {
  it("retains files through matter and email holds and replays usage retries", async () => {
    const { library, ready, objects } = createFixture();
    const id = await ready();
    await library.reserve(owner, id, "save-1", "matter:M-1");
    await library.attach(owner, id, "save-1", "matter:M-1");

    const retain = async () => {
      await library.reserve(owner, id, "message-1/a-1", "email:message-1");
      await library.attach(owner, id, "message-1/a-1", "email:message-1");
      return { fileId: id };
    };

    expect(await retain()).toEqual(await retain());
    await library.release(owner, id, "save-1", "matter:M-1");
    await expect(library.remove(owner, id)).rejects.toMatchObject({
      code: "CONFLICT",
    });

    await library.release(owner, id, "message-1/a-1", "email:message-1");
    expect((await library.remove(owner, id)).state).toBe("deleted");
    await expect(retain()).rejects.toThrow();
    expect(objects.versions.size).toBe(1);
  });

  it("keeps unresolved reservations indefinitely and rejects hold identity reuse", async () => {
    const { library, ready, clock } = createFixture();
    const id = await ready();
    await library.reserve(owner, id, "save-unknown", "matter:M-1");
    clock.now += 10 * 86_400_000;
    await expect(
      library.attach(owner, id, "save-unknown", "email:other"),
    ).rejects.toThrow("identity changed");

    expect((await library.diagnostics(owner)).blocked).toContainEqual({
      fileId: id,
      reason: "retained by consumer",
    });
  });

  it("requires a reservation before attachment and keeps released tombstones", async () => {
    const { library, ready } = createFixture();
    const id = await ready();
    await expect(
      library.attach(owner, id, "never-reserved", "matter:M-1"),
    ).rejects.toThrow("reserve usage before confirmation");

    await library.reserve(owner, id, "save-1", "matter:M-1");
    await library.release(owner, id, "save-1", "matter:M-1");
    await expect(
      library.reserve(owner, id, "save-1", "matter:M-1"),
    ).rejects.toThrow("usage already released");

    expect(
      (await library.release(owner, id, "save-1", "matter:M-1")).holdCount,
    ).toBe(0);
  });

  it("enforces 20 lifetime holds per file but still replays existing ones", async () => {
    const { library, ready } = createFixture();
    const id = await ready();

    for (let index = 0; index < 20; index++) {
      await library.reserve(owner, id, `hold-${index}`, "matter:M-1");
      await library.release(owner, id, `hold-${index}`, "matter:M-1");
    }

    await expect(
      library.reserve(owner, id, "hold-20", "matter:M-1"),
    ).rejects.toThrow("usage limit reached");

    await library.release(owner, id, "hold-3", "matter:M-1");
  });

  it("serializes attachment against deletion so exactly one wins safely", async () => {
    const { library, ready, options } = createFixture();
    const id = await ready();

    const outcomes = await Promise.allSettled([
      library.reserve(owner, id, "race", "matter:M-1"),
      library.remove(owner, id),
    ]);

    expect(outcomes.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const [row] = (await options.repository.read(owner.tenantId)).files;
    expect(
      row.state === "deleted" ? row.holds.length === 0 : row.holds.length === 1,
    ).toBe(true);
  });

  it("hides deleted rows by default and lists tombstones only on request", async () => {
    const { library, ready } = createFixture();
    const kept = await ready();
    const removed = await ready();
    await library.remove(owner, removed);
    expect((await library.list(owner, {})).items.map((f) => f.id)).toEqual([
      kept,
    ]);

    expect(
      (await library.list(owner, { state: "deleted" })).items.map((f) => f.id),
    ).toEqual([removed]);

    await expect(library.download(owner, removed)).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
  });

  it("reports expired uploads as review-only candidates without mutating storage", async () => {
    const { library, clock, options } = createFixture();

    const ticket = await library.begin(owner, {
      operationId: crypto.randomUUID(),
      scope: "matter:M-1",
      name: "abandoned.txt",
      category: "user",
      tags: [],
      contentType: "text/plain",
      sizeBytes: 3,
      checksum: "a".repeat(64),
    });

    clock.now += 3 * 86_400_000;
    const before = await options.repository.read(owner.tenantId);
    const report = await library.diagnostics(owner);
    expect(report.candidates).toEqual([
      { fileId: ticket.file.id, reason: "expired upload; review only" },
    ]);

    expect(report.mode).toBe("report-only");
    expect(await options.repository.read(owner.tenantId)).toEqual(before);
  });
});
