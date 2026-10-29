import { defaultFileTypeRegistry } from "../../file-types/defaultFileTypeRegistry";
import { describe, expect, it, vi } from "vitest";
import type { FileRecord } from "../fileLibraryContracts";
import { createFixture, owner } from "./fileLibraryFixture";

/** Rewrites stored records into the 0.1.6 shape: full file name in `name`,
 * no `extension` or `typeStatus`. */
const legacy = async (
  setup: ReturnType<typeof createFixture>,
  rows: { name: string; contentType: string }[],
) => {
  const ids = [];
  for (let index = 0; index < rows.length; index++)
    ids.push(await setup.ready());
  const partition = await setup.options.repository.read(owner.tenantId);

  partition.files.forEach((file, index) => {
    const row = file as Partial<FileRecord>;
    delete row.extension;
    delete row.typeStatus;
    Object.assign(file, { category: "admin" }); // Old metadata must not become the type category.
    file.name = rows[index]!.name;
    delete file.typeId;
    file.contentType = rows[index]!.contentType;
  });

  expect(
    await setup.options.repository.save(partition, partition.revision++),
  ).toBe(true);

  return ids;
};

describe("file records written by 0.1.6", () => {
  it("derive names, extensions and labels on read without a backfill", async () => {
    const setup = createFixture();
    await legacy(setup, [
      { name: "report.v2.pdf", contentType: "application/pdf" },
      { name: "scan.jpeg.pdf", contentType: "application/pdf" },
      { name: "notes", contentType: "text/plain" },
      { name: "Photo.JPG", contentType: "image/jpeg" },
      { name: "export.dat", contentType: "application/x-legacy-export" },
    ]);

    const { items } = await setup.library.list(owner, {});
    expect(items.every((file) => !("category" in file))).toBe(true);
    expect(
      (await setup.library.list(owner, { category: "image" })).items.map(
        (file) => file.fileName,
      ),
    ).toEqual(["Photo.jpg"]);

    expect(
      items
        .map(({ name, extension, fileName, type }) => ({
          name,
          extension,
          fileName,
          type,
        }))
        .sort((a, b) => a.fileName.localeCompare(b.fileName)),
    ).toEqual(
      [
        [
          "report.v2",
          "pdf",
          "report.v2.pdf",
          "application/pdf",
          "PDF document",
        ],
        [
          "scan.jpeg",
          "pdf",
          "scan.jpeg.pdf",
          "application/pdf",
          "PDF document",
        ],
        ["notes", "txt", "notes.txt", "text/plain", "Plain text"],
        ["Photo", "jpg", "Photo.jpg", "image/jpeg", "JPEG image"],
        [
          "export.dat",
          null,
          "export.dat",
          "application/x-legacy-export",
          "Unknown file type",
        ],
      ]
        .sort((a, b) => a[2]!.localeCompare(b[2]!))
        .map(([name, extension, fileName, id, label]) => ({
          name,
          extension,
          fileName,
          type: {
            id: defaultFileTypeRegistry().get(id!)?.id ?? "unknown",
            label,
            category: defaultFileTypeRegistry().get(id!)?.category ?? "other",
          },
        })),
    );
  });

  it("download under the derived name as octet-stream", async () => {
    const setup = createFixture();

    const [id] = await legacy(setup, [
      { name: "report.v2.pdf", contentType: "text/plain" },
    ]);

    const download = vi.spyOn(setup.options.driver, "download");
    await setup.library.download(owner, id!);
    expect(download.mock.calls[0]![0]).toMatchObject({
      name: "report.v2.pdf.txt",
      contentType: "application/octet-stream",
    });
  });

  it("are rewritten in the new shape on the first rename", async () => {
    const setup = createFixture();

    const [id] = await legacy(setup, [
      { name: "report.v2.pdf", contentType: "application/pdf" },
    ]);

    const { items } = await setup.library.list(owner, {});
    expect(items.every((file) => !("category" in file))).toBe(true);
    expect(
      (await setup.library.list(owner, { category: "document" })).items.map(
        (file) => file.fileName,
      ),
    ).toEqual(["report.v2.pdf"]);

    const renamed = await setup.library.edit(owner, {
      fileId: id!,
      revision: items[0]!.revision,
      name: "report.v3.pdf",
      tags: [],
    });

    expect(renamed).toMatchObject({
      name: "report.v3",
      fileName: "report.v3.pdf",
    });

    const [stored] = (await setup.options.repository.read(owner.tenantId))
      .files;

    expect(stored).toMatchObject({ name: "report.v3", extension: "pdf" });
  });
});
