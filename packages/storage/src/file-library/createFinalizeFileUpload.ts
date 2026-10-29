import type { FileView } from "./fileLibraryTypes.js";
import { withStorageDeadline } from "./withStorageDeadline.js";
import { FileStorageError } from "../FileStorageError.js";
import type { Actor } from "./fileLibraryContracts.js";
import type { FileLibraryContext } from "./createFileLibraryContext.js";
import type { FileTypeStatus } from "../file-types/fileTypeContracts.js";
import { checkedTypeStatus } from "./checkedTypeStatus.js";

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
    types,
    view,
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
      return view(original);
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
      return view(claimed);
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

      const type = types.registry.get(claimed.contentType);
      const contentCheck = type ? types.contentCheck(type) : "exact";

      const scanInput = {
        key: claimed.key,
        version: inspection.version,
        checksum: claimed.checksum,
        contentType: claimed.contentType,
        contentCheck,
      };

      let typeStatus: FileTypeStatus = "inferred";

      const result = await withStorageDeadline(async (signal) => {
        const validation =
          valid && options.byteValidator
            ? await options.byteValidator.validate({ ...scanInput, signal })
            : valid;

        const bytesValid =
          typeof validation === "boolean" ? validation : validation.valid;

        if (!bytesValid) return "rejected" as const;
        if (options.byteValidator)
          typeStatus =
            typeof validation === "boolean"
              ? checkedTypeStatus(contentCheck)
              : validation.typeStatus;
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
        if (result !== "rejected") file.typeStatus = typeStatus;
        file.lease = null;
        file.leaseUntil = 0;
        touch(partition, file, actor, "verification.finished");
        return view(file);
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
