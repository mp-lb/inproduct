import { createHash } from "node:crypto";
import { beginFileSchema } from "./fileLibrarySchemas.js";
import type { BeginFile } from "./fileLibraryTypes.js";
import { FileStorageError } from "../FileStorageError.js";
import type { Actor, FileRecord } from "./fileLibraryContracts.js";
import { withStorageDeadline } from "./withStorageDeadline.js";
import type { FileLibraryContext } from "./createFileLibraryContext.js";
import { resolveUploadType } from "./resolveUploadType.js";

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
    types,
    view,
    checkProvider,
  } = context;

  return async (actor: Actor, raw: BeginFile) => {
    const input = beginFileSchema.parse(raw);
    const resolved = resolveUploadType(input.name, input.contentType, types);
    checkProvider();
    await allow(actor, "upload");

    const hash = createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex");

    const id = uuid();
    const until = now() + 300_000;

    const proposed: FileRecord = {
      id,
      tenantId: actor.tenantId,
      ownerId: actor.id,
      operationId: input.operationId,
      requestHash: hash,
      key: `files/${id}`,
      name: resolved.name,
      extension: resolved.extension,

      tags: input.tags,
      sizeBytes: input.sizeBytes,
      typeId: resolved.type.id,
      typeStatus: resolved.type.id === "unknown" ? "unknown" : "inferred",
      checksum: input.checksum,
      version: null,
      versionPinning: options.driver.capabilities.versioned,
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

    const links = [
      ...new Map(
        (input.links ?? []).map((link) => [JSON.stringify(link), link]),
      ).values(),
    ];

    for (const link of links) {
      await allow(actor, "link", proposed, { link });
      const limit = options.maxLinksPerType?.[link.type];
      if (
        limit &&
        links.filter((target) => target.type === link.type).length > limit
      )
        throw new FileStorageError("CONFLICT", "file link limit reached");
    }

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

      const record = structuredClone(proposed);
      partition.files.push(record);
      touch(partition, record, actor, "upload.requested");

      for (const link of links) {
        (partition.links ??= []).push({ fileId: record.id, ...link });
        touch(partition, record, actor, "linked");
        partition.audit[partition.audit.length - 1].details.link = link;
      }

      return record;
    });

    await allow(actor, "write", file);
    if (file.state !== "pending") return { file: view(file), upload: null };

    const upload = await withStorageDeadline(
      (signal) =>
        options.driver.signUpload({
          key: file.key,
          metadata: { ...input, contentType: resolved.type.mediaType },
          expiresAt: until,
          signal,
        }),
      timeoutMs,
    );

    return { file: view(file), upload: { ...upload, expiresAt: until } };
  };
};
