import { HeadObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import type { ObjectInspection } from "../file-library/fileLibraryContracts.js";

/** Requires a full-object SHA-256 and honors any required version pin. */
export const inspectS3Object = async (
  client: S3Client,
  bucket: string,
  key: string,
  version?: string,
  signal?: AbortSignal,
  versionPinning = false,
): Promise<ObjectInspection> => {
  const head = await client.send(
    new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
      VersionId: version,
      ChecksumMode: "ENABLED",
    }),
    { abortSignal: signal },
  );

  const digest = Buffer.from(head.ChecksumSHA256 ?? "", "base64");
  if (
    (versionPinning && (!head.VersionId || head.VersionId === "null")) ||
    (version && head.VersionId !== version) ||
    head.ContentLength === undefined ||
    !head.ContentType ||
    digest.length !== 32 ||
    head.ChecksumType === "COMPOSITE"
  )
    throw new Error(
      "provider did not return an immutable full-object checksum",
    );
  return {
    version:
      head.VersionId && head.VersionId !== "null" ? head.VersionId : null,
    sizeBytes: head.ContentLength,
    contentType: head.ContentType,
    checksum: digest.toString("hex"),
  };
};
