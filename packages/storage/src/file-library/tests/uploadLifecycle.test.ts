import { describe, expect, it, vi } from "vitest";
import {
  bytes,
  checksumOf,
  createFixture,
  metadata,
  owner,
} from "./fileLibraryFixture";

describe("file library upload lifecycle", () => {
  it("resumes concurrent begin retries without duplicate quota and rejects a changed payload", async () => {
    const { library, options } = createFixture();
    const input = metadata();

    const tickets = await Promise.all([
      library.begin(owner, input),
      library.begin(owner, input),
    ]);

    expect(tickets[0].file.id).toBe(tickets[1].file.id);
    expect((await options.repository.read(owner.tenantId)).files).toHaveLength(
      1,
    );

    await expect(
      library.begin(owner, { ...input, name: "different.txt" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("prevents concurrent quota oversubscription and keeps soft-deleted reservations", async () => {
    const { library } = createFixture({ quotaBytes: bytes.byteLength });

    const results = await Promise.allSettled([
      library.begin(owner, metadata()),
      library.begin(owner, metadata()),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);

    const [file] = (await library.list(owner, {})).items;
    await library.remove(owner, file.id);
    await expect(library.begin(owner, metadata())).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
  });

  it("persists configured quota across library instances", async () => {
    const first = createFixture();
    expect(
      await first.library.setQuota(owner, { quotaBytes: bytes.byteLength }),
    ).toEqual({ quotaBytes: bytes.byteLength });

    const restarted = createFixture({ repository: first.options.repository });
    expect((await restarted.library.diagnostics(owner)).quotaBytes).toBe(
      bytes.byteLength,
    );

    await restarted.library.begin(owner, metadata());
    await expect(
      restarted.library.begin(owner, metadata()),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("enforces the lifetime file limit while keeping existing retries", async () => {
    const { library } = createFixture({ maxFiles: 1, quotaBytes: 10_000 });
    const input = metadata();
    const first = await library.begin(owner, input);
    await expect(library.begin(owner, metadata())).rejects.toThrow(
      "storage quota reached",
    );

    expect((await library.begin(owner, input)).file.id).toBe(first.file.id);
  });

  it("pins one version through duplicate finalization and later upload URL reuse", async () => {
    const { library, objects, options } = createFixture();
    const ticket = await library.begin(owner, metadata());
    const version = objects.upload(ticket.upload!.url, bytes);
    await library.finalize(owner, ticket.file.id);
    objects.upload(ticket.upload!.url, new TextEncoder().encode("swap"), true);
    await library.finalize(owner, ticket.file.id);

    const [record] = (await options.repository.read(owner.tenantId)).files;
    expect(record.version).toBe(version);
    const download = await library.download(owner, ticket.file.id);
    expect(download.url).toContain(Buffer.from(bytes).toString("base64"));
    expect(ticket.file).not.toHaveProperty("key");
    expect(ticket.file).not.toHaveProperty("version");
  });

  it("recovers a scanner outage on retry without repinning the version", async () => {
    const { library, objects, options } = createFixture();
    const ticket = await library.begin(owner, metadata());
    objects.upload(ticket.upload!.url, bytes);

    const scan = vi
      .spyOn(objects.scanner, "scan")
      .mockRejectedValueOnce(new Error("outage"));

    await expect(library.finalize(owner, ticket.file.id)).rejects.toThrow(
      "outage",
    );

    const pinned = (await options.repository.read(owner.tenantId)).files[0]
      .version;

    expect(pinned).toBeTruthy();
    objects.upload(ticket.upload!.url, new TextEncoder().encode("swap"), true);

    expect((await library.finalize(owner, ticket.file.id)).state).toBe(
      "available",
    );

    expect(
      (await options.repository.read(owner.tenantId)).files[0].version,
    ).toBe(pinned);

    expect(scan).toHaveBeenCalledTimes(2);
  });

  it("keeps a missing object retryable and quarantines mismatched bytes", async () => {
    const { library, objects } = createFixture();
    const ticket = await library.begin(owner, metadata());
    await expect(library.finalize(owner, ticket.file.id)).rejects.toThrow(
      "synthetic object missing",
    );

    objects.upload(ticket.upload!.url, new TextEncoder().encode("wrong"));
    expect((await library.finalize(owner, ticket.file.id)).state).toBe(
      "quarantined",
    );

    await expect(library.download(owner, ticket.file.id)).rejects.toMatchObject(
      { code: "PRECONDITION_FAILED" },
    );
  });

  it("fails closed without a scanner or immutable provider capabilities", async () => {
    const { library, objects } = createFixture();
    await expect(
      createFixture({ scanner: undefined }).library.begin(owner, metadata()),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });

    objects.driver.capabilities.versioned = false;
    await expect(library.begin(owner, metadata())).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
  });

  it("fences concurrent verification and refuses deletion while verifying", async () => {
    const { library, objects } = createFixture();
    const ticket = await library.begin(owner, metadata());
    objects.upload(ticket.upload!.url, bytes);
    let release!: () => void;
    let entered!: () => void;
    const started = new Promise<void>((resolve) => (entered = resolve));
    const wait = new Promise<void>((resolve) => (release = resolve));
    const original = objects.scanner.scan;
    vi.spyOn(objects.scanner, "scan").mockImplementationOnce(async (input) => {
      entered();
      await wait;
      return original(input);
    });

    const first = library.finalize(owner, ticket.file.id);
    await started;
    await expect(library.remove(owner, ticket.file.id)).rejects.toMatchObject({
      code: "CONFLICT",
    });

    await expect(library.finalize(owner, ticket.file.id)).rejects.toThrow(
      "verification in progress",
    );

    release();
    expect((await first).state).toBe("available");
  });

  it("prevents an expired verification worker from publishing availability", async () => {
    const { library, objects, clock } = createFixture();
    const ticket = await library.begin(owner, metadata());
    objects.upload(ticket.upload!.url, bytes);
    const original = objects.scanner.scan;
    vi.spyOn(objects.scanner, "scan").mockImplementationOnce(async (input) => {
      clock.now += 61_000;
      return original(input);
    });

    await expect(library.finalize(owner, ticket.file.id)).rejects.toThrow(
      "verification claim changed",
    );

    expect((await library.finalize(owner, ticket.file.id)).state).toBe(
      "available",
    );
  });

  it("bounds a hung scanner with the operation deadline and permits retry", async () => {
    const { library, objects } = createFixture({ operationTimeoutMs: 20 });
    const ticket = await library.begin(owner, metadata());
    objects.upload(ticket.upload!.url, bytes);
    vi.spyOn(objects.scanner, "scan").mockImplementationOnce(
      () => new Promise(() => undefined),
    );

    await expect(library.finalize(owner, ticket.file.id)).rejects.toThrow(
      "timed out",
    );

    expect((await library.finalize(owner, ticket.file.id)).scan).toBe("clean");
  });

  it("accepts byte-validated unscanned files only under an explicit policy", async () => {
    const objects = createFixture().objects;

    const { createFileByteValidator } =
      await import("../createFileByteValidator");

    const { library } = createFixture({
      driver: objects.driver,
      scanner: undefined,
      malwarePolicy: "allow-unscanned",
      byteValidator: createFileByteValidator(objects.readVersion),
    });

    const ticket = await library.begin(owner, metadata());
    objects.upload(ticket.upload!.url, bytes);
    const file = await library.finalize(owner, ticket.file.id);
    expect(file).toMatchObject({ state: "available", scan: "not_scanned" });

    const active = new TextEncoder().encode("<script>alert(1)</script>");

    const rejected = await library.begin(
      owner,
      metadata({ sizeBytes: active.length, checksum: checksumOf(active) }),
    );

    objects.upload(rejected.upload!.url, active);
    expect((await library.finalize(owner, rejected.file.id)).state).toBe(
      "quarantined",
    );
  });

  it("rejects an expired upload intent on retry", async () => {
    const { library, clock } = createFixture();
    const input = metadata();
    await library.begin(owner, input);
    clock.now += 86_400_001;
    await expect(library.begin(owner, input)).rejects.toThrow(
      "upload intent expired",
    );
  });
});
