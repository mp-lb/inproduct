import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { S3Connection } from "./s3Connection.js";
import type { VersionedDocumentStorage } from "./versionedDocumentStorage.js";
import { createS3Client } from "./createS3Client.js";
import { assertBucketVersioning } from "./assertBucketVersioning.js";
import { attachmentDisposition } from "./attachmentDisposition.js";

const expiresInSeconds = 300;

/**
 * Compatibility adapter for domains that own document keys and metadata.
 * Verification is metadata-only (version, size, type); it does not scan or
 * check checksums. Prefer the file library for new verified uploads.
 */
export const createVersionedDocumentStorage = (
  input: S3Connection,
): VersionedDocumentStorage => {
  const client = createS3Client(input);
  return {
    prepareUpload: async ({ key, contentType, sizeBytes }) => {
      await assertBucketVersioning(client, input.bucket);

      const url = await getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: input.bucket,
          Key: key,
          ContentType: contentType,
          ContentLength: sizeBytes,
        }),
        {
          expiresIn: expiresInSeconds,
          signableHeaders: new Set(["content-type", "content-length"]),
        },
      );

      return {
        url,
        headers: { "Content-Type": contentType },
        expiresInSeconds,
      };
    },
    inspect: async (key) => {
      const response = await client.send(
        new HeadObjectCommand({ Bucket: input.bucket, Key: key }),
      );

      if (
        !response.VersionId ||
        response.VersionId === "null" ||
        response.ContentLength === undefined ||
        !response.ContentType
      )
        throw new Error(
          "uploaded document has no immutable version or metadata",
        );
      return {
        sizeBytes: response.ContentLength,
        contentType: response.ContentType,
        versionId: response.VersionId,
      };
    },
    prepareDownload: async ({ key, versionId, fileName }) => ({
      url: await getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: input.bucket,
          Key: key,
          VersionId: versionId,
          ResponseContentType: "application/octet-stream",
          ResponseContentDisposition: attachmentDisposition(fileName),
        }),
        { expiresIn: expiresInSeconds },
      ),
      expiresInSeconds,
    }),
  };
};
