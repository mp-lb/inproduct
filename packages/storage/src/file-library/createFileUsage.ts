import { FileStorageError } from "../FileStorageError.js";
import type { Actor } from "./fileLibraryContracts.js";
import { fileView } from "./fileView.js";
import type { FileLibraryContext } from "./createFileLibraryContext.js";

export const createFileUsage = (context: FileLibraryContext) => {
  const { mutate, find, read, allow, touch, isAccepted } = context;

  return async (
    actor: Actor,
    id: string,
    holdId: string,
    consumer: string,
    state: "reserved" | "attached" | "released",
  ) => {
    if (!holdId || holdId.length > 160 || !consumer || consumer.length > 160)
      throw new FileStorageError("INVALID_INPUT", "invalid usage identity");

    const current = await read(
      actor,
      id,
      state === "released" ? "release" : "attach",
    );

    await allow(actor, state === "released" ? "release" : "attach", current, {
      consumer,
    });

    return mutate(actor, (partition) => {
      const file = find(partition, id);
      if (state !== "released" && !isAccepted(file))
        throw new FileStorageError(
          "PRECONDITION_FAILED",
          "file is not available",
        );
      const hold = file.holds.find((entry) => entry.id === holdId);
      if (hold && hold.consumer !== consumer)
        throw new FileStorageError("CONFLICT", "usage identity changed");
      if (hold?.state === "released" && state !== "released")
        throw new FileStorageError("CONFLICT", "usage already released");
      if (!hold && state === "attached")
        throw new FileStorageError(
          "PRECONDITION_FAILED",
          "reserve usage before confirmation",
        );
      if (!hold && file.holds.length >= 20)
        throw new FileStorageError(
          "PRECONDITION_FAILED",
          "usage limit reached",
        );
      if (
        hold &&
        (hold.state === state ||
          (hold.state === "attached" && state === "reserved"))
      )
        return fileView(file);
      if (hold) {
        if (!(hold.state === "attached" && state === "reserved"))
          hold.state = state;
      } else file.holds.push({ id: holdId, consumer, state });
      touch(partition, file, actor, `usage.${state}`, { id: holdId, consumer });
      return fileView(file);
    });
  };
};
