import { createHash, randomUUID } from "node:crypto";
import { createFileLibrary } from "../createFileLibrary.js";
import { createMemoryFileRepository } from "../createMemoryFileRepository.js";
import { createSyntheticObjects } from "../createSyntheticObjects.js";
import type {
  Actor,
  AuthorizeFileAction,
  FileLibraryOptions,
  FileRepository,
} from "../fileLibraryContracts.js";
import type { BeginFile } from "../fileLibraryTypes.js";

export const owner: Actor = { id: "owner", tenantId: "tenant-a" };
export const reader: Actor = { id: "reader", tenantId: "tenant-a" };
export const bytes = new TextEncoder().encode("Synthetic test document");

export const checksumOf = (value: Uint8Array) =>
  createHash("sha256").update(value).digest("hex");

export const metadata = (overrides: Partial<BeginFile> = {}): BeginFile => ({
  operationId: randomUUID(),
  scope: "matter:M-1",
  name: "example.txt",

  tags: [],
  contentType: "text/plain",
  sizeBytes: bytes.byteLength,
  checksum: checksumOf(bytes),
  ...overrides,
});

/** Owner-only policy: diagnostics/configure for the owner, consumers limited to matter/email. */
export const ownerPolicy: AuthorizeFileAction = async ({
  actor,
  file,
  consumer,
}) =>
  actor.id === "owner" &&
  (!file || file.ownerId === actor.id) &&
  (!consumer ||
    consumer.startsWith("matter:") ||
    consumer.startsWith("email:"));

/** A controllable clock, synthetic provider and memory repository around one library. */
export const createFixture = (
  overrides: Partial<FileLibraryOptions> & { repository?: FileRepository } = {},
) => {
  const clock = { now: 1_800_000_000_000 };
  const objects = createSyntheticObjects();

  const options: FileLibraryOptions = {
    repository: createMemoryFileRepository(),
    driver: objects.driver,
    scanner: objects.scanner,
    quotaBytes: 1000,
    now: () => clock.now,
    authorize: ownerPolicy,
    ...overrides,
  };

  const library = createFileLibrary(options);

  const ready = async (actor = owner, content = bytes) => {
    const ticket = await library.begin(
      actor,
      metadata({
        sizeBytes: content.byteLength,
        checksum: checksumOf(content),
      }),
    );

    objects.upload(ticket.upload!.url, content);
    await library.finalize(actor, ticket.file.id);
    return ticket.file.id;
  };

  return { clock, objects, options, library, ready };
};
