import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ObjectDriver } from "../file-library/fileLibraryContracts.js";
import type { S3Connection } from "./s3Connection.js";
import { createS3Client } from "./createS3Client.js";
import { assertSecureEndpoint } from "./assertSecureEndpoint.js";
import { assertKeyPrefix } from "./assertKeyPrefix.js";
import { assertBucketVersioning } from "./assertBucketVersioning.js";
import { attachmentDisposition } from "./attachmentDisposition.js";
import { capabilitySeconds } from "./capabilitySeconds.js";
import { inspectS3Object } from "./inspectS3Object.js";
import { readS3ObjectVersion } from "./readS3ObjectVersion.js";

/**
 * Object driver for a versioned S3 bucket. Uploads are presigned conditional
 * creates bound to type, length and SHA-256; downloads pin a version as an
 * attachment. `readVersion` feeds byte validators and scanners.
 */
export const createS3FileDriver = (
  config: S3Connection & {
    /** Defaults to `file-library/`. */
    prefix?: string;
    allowLocalHttpForTests?: boolean;
  },
) => {
  assertSecureEndpoint(config.endpoint, !!config.allowLocalHttpForTests);
  const prefix = config.prefix ?? "file-library/";
  assertKeyPrefix(prefix);

  const keyFor = (key: string) => {
    if (!/^files\/[a-f0-9-]{36}$/.test(key))
      throw new Error("invalid file object key");
    return prefix + key;
  };

  const client = createS3Client(config);

  const driver: ObjectDriver = {
    capabilities: { versioned: true, checksum: true, conditionalCreate: true },
    signUpload: async ({ key, metadata, expiresAt, signal }) => {
      await assertBucketVersioning(client, config.bucket, signal);
      const checksum = Buffer.from(metadata.checksum, "hex").toString("base64");

      const command = new PutObjectCommand({
        Bucket: config.bucket,
        Key: keyFor(key),
        ContentType: metadata.contentType,
        ContentLength: metadata.sizeBytes,
        ChecksumSHA256: checksum,
        IfNoneMatch: "*",
      });

      return {
        url: await getSignedUrl(client, command, {
          expiresIn: capabilitySeconds(expiresAt),
          signableHeaders: new Set([
            "content-type",
            "content-length",
            "if-none-match",
          ]),
          unhoistableHeaders: new Set(["x-amz-checksum-sha256"]),
        }),
        headers: {
          "Content-Type": metadata.contentType,
          "If-None-Match": "*",
          "x-amz-checksum-sha256": checksum,
        },
      };
    },
    inspect: (key, version, signal) =>
      inspectS3Object(client, config.bucket, keyFor(key), version, signal),
    download: async ({ key, version, name, expiresAt }) => ({
      url: await getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: keyFor(key),
          VersionId: version,
          ResponseContentType: "application/octet-stream",
          ResponseCacheControl: "private, no-store",
          ResponseContentDisposition: attachmentDisposition(name),
        }),
        { expiresIn: capabilitySeconds(expiresAt) },
      ),
    }),
  };

  return {
    driver,
    readVersion: (key: string, version: string, signal?: AbortSignal) =>
      readS3ObjectVersion(client, config.bucket, keyFor(key), version, signal),
    close: () => client.destroy(),
  };
};
