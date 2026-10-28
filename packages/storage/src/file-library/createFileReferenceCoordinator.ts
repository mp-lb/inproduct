import { createHash } from "node:crypto";
import { FileStorageError } from "../FileStorageError.js";
import type { Actor } from "./fileLibraryContracts.js";
import type { FileLibrary } from "./createFileLibrary.js";
import type { FileReference, FileReferenceStore } from "./fileReferences.js";

/**
 * Durable host association protocol: intent → bound → detaching → released.
 * Never compensates on uncertain outcomes; retrying the same reference recovers it.
 */
export const createFileReferenceCoordinator = (options: {
  storage: Pick<FileLibrary, "reserve" | "attach" | "release">;
  references: FileReferenceStore;
  authorize(actor: Actor, reference: FileReference): Promise<boolean>;
}) => {
  const { storage, references } = options;

  const check = async (actor: Actor, reference: FileReference) => {
    if (
      actor.tenantId !== reference.actor.tenantId ||
      actor.id !== reference.actor.id ||
      !(await options.authorize(actor, reference))
    )
      throw new FileStorageError("FORBIDDEN", "reference access denied");
  };

  const load = async (actor: Actor, id: string) => {
    const row = await references.read(actor.tenantId, id);
    if (!row) throw new FileStorageError("NOT_FOUND", "reference not found");
    await check(actor, row);
    return row;
  };

  const advance = (
    row: FileReference,
    state: FileReference["state"],
    delivered = false,
  ) =>
    references.save(
      { ...row, state, delivered, revision: row.revision + 1 },
      row.revision,
    );

  const reconcile = async (
    actor: Actor,
    id: string,
  ): Promise<FileReference> => {
    for (let attempt = 0; attempt < 12; attempt++) {
      const row = await load(actor, id);
      if (row.delivered) return row;

      const hold = createHash("sha256")
        .update(JSON.stringify([actor.tenantId, id]))
        .digest("hex");

      // Never compensate on exceptions: a host or storage commit may have succeeded.
      if (row.state === "intent") {
        await storage.reserve(actor, row.fileId, hold, row.consumer);
        await advance(row, "bound");
      } else if (row.state === "bound") {
        await storage.attach(actor, row.fileId, hold, row.consumer);
        await advance(row, "bound", true);
      } else {
        await storage.release(actor, row.fileId, hold, row.consumer);
        await advance(row, "released", true);
      }
    }

    throw new FileStorageError("CONFLICT", "reference changed; retry");
  };

  return {
    reconcile,
    attach: async (
      actor: Actor,
      input: Pick<FileReference, "referenceId" | "fileId" | "consumer">,
    ) => {
      if (
        [
          input.referenceId,
          input.fileId,
          input.consumer,
          actor.id,
          actor.tenantId,
        ].some((value) => !value || value.length > 160)
      )
        throw new FileStorageError(
          "INVALID_INPUT",
          "invalid reference identity",
        );

      const desired: FileReference = {
        ...input,
        actor,
        revision: 1,
        state: "intent",
        delivered: false,
      };

      await check(actor, desired);
      await references.save(desired, 0);
      const row = await load(actor, input.referenceId);
      if (row.fileId !== input.fileId || row.consumer !== input.consumer)
        throw new FileStorageError("CONFLICT", "reference identity changed");
      const result = await reconcile(actor, input.referenceId);
      if (result.state !== "bound")
        throw new FileStorageError("CONFLICT", "reference already detached");
      return result;
    },
    detach: async (actor: Actor, id: string) => {
      for (let attempt = 0; attempt < 12; attempt++) {
        const row = await load(actor, id);
        if (row.state === "detaching" || row.state === "released")
          return reconcile(actor, id);
        if (await advance(row, "detaching")) return reconcile(actor, id);
      }

      throw new FileStorageError("CONFLICT", "reference changed; retry");
    },
  };
};
