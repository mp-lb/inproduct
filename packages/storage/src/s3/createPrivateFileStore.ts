import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { S3Connection } from "./s3Connection.js";
import type { PrivateFileStore } from "./privateFileStore.js";
import { createS3Client } from "./createS3Client.js";
import { assertSecureEndpoint } from "./assertSecureEndpoint.js";
import { assertKeyPrefix } from "./assertKeyPrefix.js";
import { attachmentDisposition } from "./attachmentDisposition.js";
import { putImmutablePrivateObject } from "./putImmutablePrivateObject.js";
import { removeAllObjectVersions } from "./removeAllObjectVersions.js";

const downloadSeconds = 60;

/**
 * Immutable put, short download signing and physical version deletion for a
 * domain that owns its per-file metadata. Independent of the file library's
 * partitions, quota and holds. Loopback HTTP endpoints are accepted for local use.
 */
export const createPrivateFileStore = (
  input: S3Connection & { prefix: string },
): PrivateFileStore => {
  assertKeyPrefix(input.prefix);
  assertSecureEndpoint(input.endpoint, true);
  const client = createS3Client(input);

  const key = (id: string) => {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("invalid private file ID");
    return `${input.prefix}${id}`;
  };

  return {
    put: (id, bytes, signal) =>
      putImmutablePrivateObject(client, input.bucket, key(id), bytes, signal),
    remove: (id, signal) =>
      removeAllObjectVersions(client, input.bucket, key(id), signal),
    download: async (id, name) => ({
      url: await getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: input.bucket,
          Key: key(id),
          ResponseContentType: "application/octet-stream",
          ResponseContentDisposition: attachmentDisposition(name),
        }),
        { expiresIn: downloadSeconds },
      ),
      expiresAt: Date.now() + downloadSeconds * 1000,
    }),
  };
};
