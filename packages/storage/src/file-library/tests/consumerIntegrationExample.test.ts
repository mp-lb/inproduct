// Mirrors the "Consumer integration" example in docs/public/file-library.mdx.
import { createHash, randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import {
  createFileAuditDispatcher,
  createFileLibrary,
  createFileReferenceCoordinator,
  type Actor,
  type FileAuditLedger,
} from "../../fileLibraryServer";
import {
  createMemoryFileReferenceStore,
  createMemoryFileRepository,
  createSyntheticObjects,
} from "../../fileLibraryTesting";
import { beginFileSchema } from "../../fileLibrary";

// Host-owned pieces: session → actor, and the permission policy.
type Session = { userId: string; organizationId: string; canEdit: boolean };

const actorFor = (session: Session): Actor => ({
  id: session.userId,
  tenantId: session.organizationId,
});

it("composes a host application around the file library", async () => {
  // Production hosts use createS3FileDriver, createClamdScanner and the
  // Mongo repository/ledger/reference store from the /s3 and /node entry points.
  const objects = createSyntheticObjects();
  const repository = createMemoryFileRepository();

  const sessions = new Map<string, Session>([
    ["alice", { userId: "alice", organizationId: "org-1", canEdit: true }],
  ]);

  const library = createFileLibrary({
    repository,
    driver: objects.driver,
    scanner: objects.scanner,
    quotaBytes: 100 * 1024 * 1024,
    authorize: async ({ actor, action, file, consumer }) => {
      const session = sessions.get(actor.id);
      if (!session?.canEdit) return false;
      if (consumer && !consumer.startsWith("project:")) return false;
      if (action === "diagnostics" || action === "configure") return false;
      return !file || file.ownerId === actor.id;
    },
  });

  const projects = new Map([["P-1", { owner: "alice" }]]);

  const references = createFileReferenceCoordinator({
    storage: library,
    references: createMemoryFileReferenceStore(),
    authorize: async (actor, reference) =>
      projects.get(reference.consumer.slice("project:".length))?.owner ===
      actor.id,
  });

  // 1. Browser asks the API to begin; the API validates and returns an upload ticket.
  const actor = actorFor(sessions.get("alice")!);
  const content = new TextEncoder().encode("Quarterly report");

  const request = beginFileSchema.parse({
    operationId: randomUUID(),

    name: "report.txt",

    contentType: "text/plain",
    sizeBytes: content.byteLength,
    checksum: createHash("sha256").update(content).digest("hex"),
  });

  const ticket = await library.begin(actor, request);

  // 2. Browser PUTs bytes to ticket.upload.url with ticket.upload.headers.
  objects.upload(ticket.upload!.url, content);

  // 3. API finalizes: pins the version, verifies and scans.
  expect((await library.finalize(actor, ticket.file.id)).state).toBe(
    "available",
  );

  // 4. The domain record references the file through a durable association.
  const reference = await references.attach(actor, {
    referenceId: "project-P-1/attachment-1",
    fileId: ticket.file.id,
    consumer: "project:P-1",
  });

  expect(reference.state).toBe("bound");
  await expect(library.remove(actor, ticket.file.id)).rejects.toThrow(
    "retained",
  );

  // 5. A trusted worker drains the audit outbox into the host's ledger.
  const ledger: FileAuditLedger = { append: async () => undefined };

  const delivered = await createFileAuditDispatcher(
    repository,
    ledger,
  )(actor.tenantId);

  expect(delivered).toBeGreaterThan(0);
});
