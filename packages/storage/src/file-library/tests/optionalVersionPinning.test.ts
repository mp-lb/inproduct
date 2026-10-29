import { describe, expect, it, vi } from "vitest";
import { createFileByteValidator } from "../createFileByteValidator";
import { bytes, createFixture, metadata, owner } from "./fileLibraryFixture";

const standardFixture = () => {
  const setup = createFixture({
    malwarePolicy: "allow-unscanned",
    scanner: undefined,
  });

  setup.objects.driver.capabilities.versioned = false;
  const inspect = setup.objects.driver.inspect;
  setup.objects.driver.inspect = async (...args) => ({
    ...(await inspect(...args)),
    version: null,
  });

  const read = vi.fn(async () => Buffer.from(bytes));
  setup.options.byteValidator = createFileByteValidator(read);
  setup.objects.driver.download = vi.fn(async () => ({
    url: "https://example.test/file",
  }));

  return { ...setup, read };
};

describe("optional version pinning", () => {
  it("verifies, lists, downloads and deletes standard-mode files without a version", async () => {
    const { library, objects, options, read } = standardFixture();
    const ticket = await library.begin(owner, metadata());
    objects.upload(ticket.upload!.url, bytes);
    expect((await library.finalize(owner, ticket.file.id)).state).toBe(
      "available",
    );

    expect(read).toHaveBeenCalledWith(
      expect.any(String),
      null,
      expect.any(AbortSignal),
    );

    const record = (await options.repository.read(owner.tenantId)).files[0];
    expect(record).toMatchObject({ version: null, versionPinning: false });
    expect((await library.list(owner, {})).items).toHaveLength(1);
    await library.download(owner, ticket.file.id);
    expect(objects.driver.download).toHaveBeenCalledWith(
      expect.objectContaining({ version: null }),
    );

    await library.remove(owner, ticket.file.id);
    await expect(library.download(owner, ticket.file.id)).rejects.toThrow(
      "file is not available",
    );
  });

  it("quarantines bytes replaced between inspection and byte verification", async () => {
    const { library, objects, read } = standardFixture();
    const ticket = await library.begin(owner, metadata());
    objects.upload(ticket.upload!.url, bytes);
    read.mockResolvedValueOnce(Buffer.from("different content"));
    expect((await library.finalize(owner, ticket.file.id)).state).toBe(
      "quarantined",
    );

    await expect(library.download(owner, ticket.file.id)).rejects.toThrow();
  });

  it("retries transient verification failures without requiring a version", async () => {
    const { library, objects, read } = standardFixture();
    const ticket = await library.begin(owner, metadata());
    objects.upload(ticket.upload!.url, bytes);
    read.mockRejectedValueOnce(new Error("outage"));
    await expect(library.finalize(owner, ticket.file.id)).rejects.toThrow(
      "outage",
    );

    expect((await library.finalize(owner, ticket.file.id)).state).toBe(
      "available",
    );
  });

  it.each([true, undefined])(
    "does not downgrade a pinned or legacy pending upload (%s)",
    async (versionPinning) => {
      const { library, objects, options } = standardFixture();
      const ticket = await library.begin(owner, metadata());
      objects.upload(ticket.upload!.url, bytes);
      const partition = await options.repository.read(owner.tenantId);
      partition.files[0].versionPinning = versionPinning;
      await options.repository.save(partition, partition.revision);
      await expect(library.finalize(owner, ticket.file.id)).rejects.toThrow(
        "no immutable version",
      );
    },
  );
});
