import type { FileView } from "./fileLibraryTypes.js";
import { withStorageDeadline } from "./withStorageDeadline.js";
import { FileStorageError } from "../FileStorageError.js";
import type { Actor } from "./fileLibraryContracts.js";
import { fileView } from "./fileView.js";
import type { FileLibraryContext } from "./createFileLibraryContext.js";

export const createFinalizeFileUpload = (context: FileLibraryContext) => {
  const {
    options,
    now,
    uuid,
    timeoutMs,
    allow,
    mutate,
    find,
    read,
    touch,
    checkProvider,
  } = context;

  return async (actor: Actor, id: string): Promise<FileView> => {
    checkProvider();
    const original = await read(actor, id, "write");

    const scanRequired =
      (options.malwarePolicy ?? "required") === "required" ||
      original.malwarePolicy !== "allow-unscanned";

    if (scanRequired && !options.scanner)
      throw new FileStorageError(
        "PRECONDITION_FAILED",
        "this upload requires malware scanning",
      );

    if (original.state === "available") {
      if (scanRequired && original.scan !== "clean")
        throw new FileStorageError(
          "PRECONDITION_FAILED",
          "file requires malware scanning",
        );
      return fileView(original);
    }

    const claim = uuid();

    const claimed = await mutate(actor, (partition) => {
      const file = find(partition, id);
      if (file.state === "available") return file;
      if (file.state === "pending" && file.expiresAt <= now())
        throw new FileStorageError(
          "PRECONDITION_FAILED",
          "upload expired; start a new upload",
        );
      if (!["pending", "verifying"].includes(file.state))
        throw new FileStorageError(
          "PRECONDITION_FAILED",
          "file cannot be finalized",
        );
      if (file.lease && file.leaseUntil > now())
        throw new FileStorageError("CONFLICT", "verification in progress");
      if (scanRequired || options.scanner) file.malwarePolicy = "required";
      file.state = "verifying";
      file.lease = claim;
      file.leaseUntil = now() + 60_000;
      touch(partition, file, actor, "verification.started");
      return file;
    });

    if (claimed.state === "available") {
      if (scanRequired && claimed.scan !== "clean")
        throw new FileStorageError(
          "PRECONDITION_FAILED",
          "file requires malware scanning",
        );
      return fileView(claimed);
    }

    try {
      const inspection = await withStorageDeadline(
        (signal) =>
          options.driver.inspect(
            claimed.key,
            claimed.version ?? undefined,
            signal,
          ),
        timeoutMs,
      );

      if (
        !inspection.version ||
        inspection.version === "null" ||
        (claimed.version && claimed.version !== inspection.version)
      )
        throw new Error("provider returned no immutable version");

      const valid =
        inspection.sizeBytes === claimed.sizeBytes &&
        inspection.checksum === claimed.checksum &&
        inspection.contentType === claimed.contentType;

      await mutate(actor, (partition) => {
        const file = find(partition, id);
        if (
          file.lease !== claim ||
          file.state !== "verifying" ||
          file.leaseUntil <= now()
        )
          throw new FileStorageError("CONFLICT", "verification claim changed");
        file.version = inspection.version;
        return file.id;
      });

      const scanInput = {
        key: claimed.key,
        version: inspection.version,
        checksum: claimed.checksum,
        contentType: claimed.contentType,
      };

      const result = await withStorageDeadline(async (signal) => {
        const bytesValid =
          valid &&
          (!options.byteValidator ||
            (await options.byteValidator.validate({ ...scanInput, signal })));

        if (!bytesValid) return "rejected" as const;
        return options.scanner
          ? options.scanner.scan({ ...scanInput, signal })
          : ("not_scanned" as const);
      }, timeoutMs);

      if (
        !["clean", "rejected", "not_scanned"].includes(result) ||
        (result === "not_scanned" && scanRequired)
      )
        throw new Error("invalid verification outcome");
      await allow(actor, "write", claimed);
      return await mutate(actor, (partition) => {
        const file = find(partition, id);
        if (
          file.lease !== claim ||
          file.state !== "verifying" ||
          file.leaseUntil <= now()
        )
          throw new FileStorageError("CONFLICT", "verification claim changed");
        file.state = result === "rejected" ? "quarantined" : "available";
        file.scan = result;
        file.lease = null;
        file.leaseUntil = 0;
        touch(partition, file, actor, "verification.finished");
        return fileView(file);
      });
    } catch (error) {
      await mutate(actor, (partition) => {
        const file = find(partition, id);

        if (file.lease === claim) {
          file.lease = null;
          file.leaseUntil = 0;
          file.scan = "unavailable";
          touch(partition, file, actor, "verification.failed");
        }
      });

      throw error;
    }
  };
};
