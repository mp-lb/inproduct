import { createHash } from "node:crypto";
import {
  HeadObjectCommand,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";

/** Conditional create. A retried put may reuse an identical object, never overwrite it. */
export const putImmutablePrivateObject = async (
  client: S3Client,
  bucket: string,
  key: string,
  bytes: Uint8Array,
  signal: AbortSignal,
) => {
  const checksum = createHash("sha256").update(bytes).digest("hex");

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: bytes,
        ContentType: "application/octet-stream",
        IfNoneMatch: "*",
        Metadata: { sha256: checksum },
      }),
      { abortSignal: signal },
    );
  } catch (error) {
    if (!(error instanceof Error) || error.name !== "PreconditionFailed")
      throw error;

    const object = await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: key }),
      { abortSignal: signal },
    );

    if (
      object.ContentLength !== bytes.byteLength ||
      object.Metadata?.sha256 !== checksum
    )
      throw new Error("private file size changed");
  }
};
