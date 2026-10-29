import { expect, it } from "vitest";
import { createFileByteValidator } from "../createFileByteValidator";
import { createFileLibrary } from "../createFileLibrary";
import {
  createFixture,
  metadata,
  owner,
  checksumOf,
} from "./fileLibraryFixture";
import { contentFixtures } from "../../file-types/tests/contentFixtures";

it("persists a format ID without scope or MIME metadata and derives safe previews", async () => {
  const setup = createFixture({ quotaBytes: 100_000 });

  const library = createFileLibrary({
    ...setup.options,
    byteValidator: createFileByteValidator(setup.objects.readVersion),
  });

  const bytes = contentFixtures.pdf;

  const ticket = await library.begin(
    owner,
    metadata({
      name: "report.pdf",
      contentType: "application/x-pdf",
      tags: ["report"],
      checksum: checksumOf(bytes),
      sizeBytes: bytes.length,
    }),
  );

  expect(ticket.file.previewable).toBe(false);
  setup.objects.upload(ticket.upload!.url, bytes);
  const file = await library.finalize(owner, ticket.file.id);
  expect(file).toMatchObject({
    type: { id: "pdf", category: "document" },
    previewable: true,
    tags: ["report"],
  });

  expect(file).not.toHaveProperty("contentType");
  expect(file).not.toHaveProperty("scope");
  expect(file.type).not.toHaveProperty("status");

  const stored = (await setup.options.repository.read(owner.tenantId))
    .files[0]!;

  expect(stored.typeId).toBe("pdf");
  expect(stored).not.toHaveProperty("contentType");
  expect(stored).not.toHaveProperty("scope");
  await expect(library.preview(owner, file.id)).resolves.toHaveProperty("url");
  await expect(
    library.begin(owner, { ...metadata(), scope: "forged" } as never),
  ).rejects.toThrow();
});
