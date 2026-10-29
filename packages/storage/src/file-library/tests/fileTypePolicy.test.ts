import { describe, expect, it, vi } from "vitest";
import { createFileByteValidator } from "../createFileByteValidator";
import { createFileLibrary } from "../createFileLibrary";
import { createFileTypeRegistry } from "../../file-types/createFileTypeRegistry";
import { contentFixtures as fixture } from "../../file-types/tests/contentFixtures";
import type { FileLibraryOptions } from "../fileLibraryContracts";
import {
  checksumOf,
  createFixture,
  metadata,
  owner,
} from "./fileLibraryFixture";

const docx =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** A fixture whose byte validator reads the synthetic object store. */
const validated = (overrides: Partial<FileLibraryOptions> = {}) => {
  const setup = createFixture({ quotaBytes: 100_000, ...overrides });
  setup.options.byteValidator = createFileByteValidator(
    setup.objects.readVersion,
    overrides.fileTypes?.registry,
  );

  return { ...setup, library: createFileLibrary(setup.options) };
};

const upload = async (
  setup: ReturnType<typeof createFixture>,
  name: string,
  content: Uint8Array,
  contentType?: string,
) => {
  const ticket = await setup.library.begin(
    owner,
    metadata({
      name,
      contentType,
      sizeBytes: content.byteLength,
      checksum: checksumOf(content),
    }),
  );

  setup.objects.upload(ticket.upload!.url, content);
  return { ticket, file: await setup.library.finalize(owner, ticket.file.id) };
};

describe("file library type handling", () => {
  it("resolves a canonical type and editable name without a client-reported type", async () => {
    const setup = createFixture({ quotaBytes: 100_000 });

    const { ticket, file } = await upload(
      setup,
      "Minutes.2026.TXT",
      fixture.text,
    );

    expect(ticket.upload!.headers["Content-Type"]).toBe("text/plain");
    expect(file).toMatchObject({
      name: "Minutes.2026",
      extension: "txt",
      fileName: "Minutes.2026.txt",
      contentType: "text/plain",
      type: { id: "text/plain", label: "Plain text", status: "inferred" },
    });
  });

  it("normalizes reported aliases to the canonical type", async () => {
    const { file } = await upload(
      validated(),
      "scan.JPG",
      fixture.jpeg,
      "image/jpg",
    );

    expect(file).toMatchObject({
      contentType: "image/jpeg",
      extension: "jpg",
      type: { status: "recognized", label: "JPEG image" },
    });
  });

  it("rejects explicitly unaccepted types and name/type conflicts before reserving anything", async () => {
    const { library, options } = createFixture({
      fileTypes: { accept: ["text/plain", "image/jpeg"] },
    });

    for (const input of [
      { name: "Plan.docx", contentType: docx },
      { name: "capture.zzz9", contentType: undefined },
      { name: "photo.png", contentType: "image/jpeg" },
    ])
      await expect(library.begin(owner, metadata(input))).rejects.toMatchObject(
        { code: "INVALID_INPUT" },
      );
    expect((await options.repository.read(owner.tenantId)).files).toEqual([]);
  });

  it("accepts unknown types by default and preserves their extension on download", async () => {
    const setup = validated();
    const download = vi.spyOn(setup.options.driver, "download");
    const { file } = await upload(setup, "survey.zzz9", fixture.binary);
    expect(file).toMatchObject({
      name: "survey",
      extension: "zzz9",
      fileName: "survey.zzz9",
      state: "available",
      type: { label: "Unknown file type", status: "unknown" },
    });

    await setup.library.download(owner, file.id);
    expect(download).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "survey.zzz9",
        contentType: "application/octet-stream",
      }),
    );
  });

  it("accepts known formats beyond the former default and checks their content", async () => {
    const setup = validated();
    expect((await upload(setup, "Plan.docx", fixture.docx)).file).toMatchObject(
      {
        state: "available",
        type: { id: docx, status: "recognized" },
      },
    );

    expect((await upload(setup, "Other.docx", fixture.pdf)).file.state).toBe(
      "quarantined",
    );
  });

  it("keeps an extensionless unknown file extensionless", async () => {
    const { file } = await upload(validated(), "survey", fixture.binary);
    expect(file).toMatchObject({
      fileName: "survey",
      extension: null,
      type: { status: "unknown" },
    });
  });

  it("follows a configured conflict preference", async () => {
    const setup = createFixture({
      quotaBytes: 100_000,
      fileTypes: { onConflict: "prefer-extension" },
    });

    const ticket = await setup.library.begin(
      owner,
      metadata({ name: "photo.png", contentType: "image/jpeg" }),
    );

    expect(ticket.file).toMatchObject({
      contentType: "image/png",
      fileName: "photo.png",
    });
  });

  it("quarantines bytes that do not match the resolved type", async () => {
    const setup = validated();
    const html = new TextEncoder().encode("<html><body>Hi</body></html>");
    expect((await upload(setup, "notes.txt", html)).file.state).toBe(
      "quarantined",
    );

    expect((await upload(setup, "chart.png", fixture.text)).file.state).toBe(
      "quarantined",
    );
  });

  it("accepts broader types only when configured, reporting how bytes matched", async () => {
    const setup = validated({
      fileTypes: {
        accept: [docx, "text/csv", "application/pdf"],
        contentCheck: "compatible",
      },
    });

    expect((await upload(setup, "Plan.docx", fixture.docx)).file).toMatchObject(
      {
        state: "available",
        fileName: "Plan.docx",
        type: { label: "Word document", status: "recognized" },
      },
    );

    expect((await upload(setup, "totals.csv", fixture.csv)).file.type).toEqual({
      id: "text/csv",
      label: "CSV spreadsheet",
      category: "document",
      status: "compatible",
    });

    expect((await upload(setup, "Plan.docx", fixture.pdf)).file.state).toBe(
      "quarantined",
    );
  });

  it("refuses at construction to accept types it cannot check or does not know", () => {
    const fileTypes = (policy: FileLibraryOptions["fileTypes"]) => () =>
      createFixture({ fileTypes: policy });

    expect(fileTypes({ accept: ["application/msword"] })).toThrow(
      'cannot pass the "exact"',
    );

    expect(fileTypes({ accept: [docx] })).not.toThrow();
    expect(
      fileTypes({
        accept: ["application/vnd.ms-project"],
        contentCheck: "compatible",
      }),
    ).toThrow('cannot pass the "compatible"');

    expect(fileTypes({ accept: ["application/x-nope"] })).toThrow(
      "unknown file type",
    );

    expect(
      fileTypes({
        accept: ["application/vnd.ms-project"],
        contentChecks: { "application/vnd.ms-project": "unchecked" },
      }),
    ).not.toThrow();
  });

  it("supports custom types and unchecked opt-ins", async () => {
    const registry = createFileTypeRegistry({
      types: [
        {
          id: "application/vnd.acme.board+json",
          label: "Acme board",
          extensions: ["acmeboard"],
        },
        {
          id: "application/x-acme-blob",
          label: "Acme blob",
          extensions: ["acmeblob"],
        },
      ],
    });

    const setup = validated({
      fileTypes: {
        registry,
        accept: ["application/vnd.acme.board+json", "application/x-acme-blob"],
        contentCheck: "compatible",
        contentChecks: { "application/x-acme-blob": "unchecked" },
      },
    });

    expect(
      (await upload(setup, "Sprint 4.acmeboard", fixture.json)).file,
    ).toMatchObject({
      name: "Sprint 4",
      type: { label: "Acme board", status: "compatible" },
    });

    expect(
      (await upload(setup, "dump.acmeblob", fixture.binary)).file,
    ).toMatchObject({
      state: "available",
      type: { status: "inferred" },
    });
  });

  it("renames without changing the extension, type, version or bytes", async () => {
    const setup = validated();
    const { file } = await upload(setup, "Minutes.txt", fixture.text);

    const before = (await setup.options.repository.read(owner.tenantId))
      .files[0]!;

    const first = await setup.library.edit(owner, {
      fileId: file.id,
      revision: file.revision,
      name: "Final minutes.TXT",
      tags: [],
    });

    const second = await setup.library.edit(owner, {
      fileId: file.id,
      revision: first.revision,
      name: "Final.html",
      tags: [],
    });

    expect(first).toMatchObject({
      name: "Final minutes",
      fileName: "Final minutes.txt",
    });

    expect(second).toMatchObject({
      name: "Final.html",
      extension: "txt",
      fileName: "Final.html.txt",
      contentType: "text/plain",
      type: { status: "recognized" },
    });

    const after = (await setup.options.repository.read(owner.tenantId))
      .files[0]!;

    expect([after.version, after.checksum, after.key]).toEqual([
      before.version,
      before.checksum,
      before.key,
    ]);
  });

  it("downloads with the library's file name and a type only for recognized passive content", async () => {
    const setup = validated();
    const download = vi.spyOn(setup.options.driver, "download");
    const { file } = await upload(setup, "Minutes.txt", fixture.text);
    await setup.library.download(owner, file.id);

    const unvalidated = createFixture({ quotaBytes: 100_000 });
    const plain = vi.spyOn(unvalidated.options.driver, "download");
    const other = await upload(unvalidated, "Minutes.txt", fixture.text);
    await unvalidated.library.download(owner, other.file.id);

    expect(download.mock.calls[0]![0]).toMatchObject({
      name: "Minutes.txt",
      contentType: "text/plain",
    });

    expect(plain.mock.calls[0]![0]).toMatchObject({
      name: "Minutes.txt",
      contentType: "application/octet-stream",
    });
  });
});
