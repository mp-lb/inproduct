import { createHash } from "node:crypto";
import { beginFileSchema } from "./fileLibrarySchemas.js";
import type { BeginFile } from "./fileLibraryTypes.js";
import { FileStorageError } from "../FileStorageError.js";
import type { Actor, FileRecord } from "./fileLibraryContracts.js";
import { withStorageDeadline } from "./withStorageDeadline.js";
import { fileView } from "./fileView.js";
import type { FileLibraryContext } from "./createFileLibraryContext.js";

export const createBeginFileUpload = (context: FileLibraryContext) => {
  const {
    options,
    now,
    uuid,
    timeoutMs,
    maxFiles,
    allow,
    mutate,
    touch,
    checkProvider,
  } = context;

  return async (actor: Actor, raw: BeginFile) => {
    const input = beginFileSchema.parse(raw);
    checkProvider();
    await allow(actor, "upload", undefined, input);

    const hash = createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex");

    const id = uuid();
    const until = now() + 300_000;

    const file = await mutate(actor, (partition) => {
      const existing = partition.files.find(
        (entry) =>
          entry.operationId === input.operationId && entry.ownerId === actor.id,
      );

      if (existing) {
        if (existing.requestHash !== hash)
          throw new FileStorageError("CONFLICT", "operation input changed");
        if (existing.state === "pending" && existing.expiresAt <= now())
          throw new FileStorageError(
            "PRECONDITION_FAILED",
            "upload intent expired",
          );
        if (existing.state === "pending")
          existing.uploadUntil = Math.max(existing.uploadUntil, until);
        return existing;
      }

      const used = partition.files.reduce(
        (sum, entry) => sum + entry.sizeBytes,
        0,
      );

      if (
        partition.files.length >= maxFiles ||
        used + input.sizeBytes > (partition.quotaBytes ?? options.quotaBytes)
      )
        throw new FileStorageError(
          "PRECONDITION_FAILED",
          "storage quota reached",
        );

      const record: FileRecord = {
        id,
        tenantId: actor.tenantId,
        ownerId: actor.id,
        operationId: input.operationId,
        requestHash: hash,
        key: `files/${id}`,
        name: input.name,
        scope: input.scope,
        category: input.category,
        tags: input.tags,
        sizeBytes: input.sizeBytes,
        contentType: input.contentType,
        checksum: input.checksum,
        version: null,
        state: "pending",
        scan: "pending",
        malwarePolicy: options.scanner
          ? "required"
          : (options.malwarePolicy ?? "required"),
        revision: 0,
        createdAt: now(),
        updatedAt: now(),
        uploadUntil: until,
        expiresAt: now() + 86_400_000,
        lease: null,
        leaseUntil: 0,
        deletedAt: null,
        holds: [],
      };

      partition.files.push(record);
      touch(partition, record, actor, "upload.requested");
      return record;
    });

    await allow(actor, "write", file);
    if (file.state !== "pending") return { file: fileView(file), upload: null };

    const upload = await withStorageDeadline(
      (signal) =>
        options.driver.signUpload({
          key: file.key,
          metadata: input,
          expiresAt: until,
          signal,
        }),
      timeoutMs,
    );

    return { file: fileView(file), upload: { ...upload, expiresAt: until } };
  };
};
