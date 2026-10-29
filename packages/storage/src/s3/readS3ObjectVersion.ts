import { GetObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { maxLibraryFileBytes } from "../file-library/fileLibrarySchemas.js";

type Body = AsyncIterable<Uint8Array> & { destroy?: (error?: Error) => void };

/** Buffers the requested version (or current object for null), bounded by its declared length and the library limit. */
export const readS3ObjectVersion = async (
  client: S3Client,
  bucket: string,
  key: string,
  version: string | null,
  signal?: AbortSignal,
) => {
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      VersionId: version ?? undefined,
    }),
    { abortSignal: signal },
  );

  const body = response.Body as Body | undefined;
  const length = response.ContentLength;

  if (
    !body ||
    (version !== null && response.VersionId !== version) ||
    !length ||
    length > maxLibraryFileBytes
  ) {
    body?.destroy?.();
    throw new Error("invalid immutable scan source");
  }

  const abort = () => body.destroy?.(new Error("scan canceled"));
  signal?.addEventListener("abort", abort, { once: true });

  try {
    if (signal?.aborted) throw new Error("scan canceled");
    let size = 0;
    const chunks: Buffer[] = [];

    for await (const chunk of body) {
      size += chunk.byteLength;
      if (size > length) throw new Error("scan source exceeds size limit");
      chunks.push(Buffer.from(chunk));
    }

    if (size !== length) throw new Error("incomplete scan source");
    return Buffer.concat(chunks);
  } finally {
    signal?.removeEventListener("abort", abort);
    body.destroy?.();
  }
};
