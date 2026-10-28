import {
  DeleteObjectCommand,
  ListObjectVersionsCommand,
  type S3Client,
} from "@aws-sdk/client-s3";

/** Deletes actual versions and delete markers of one exact key, not just adding a marker.
 * Throws when the listing is truncated so the caller keeps its cleanup record. */
export const removeAllObjectVersions = async (
  client: S3Client,
  bucket: string,
  key: string,
  signal: AbortSignal,
) => {
  const versions = await client.send(
    new ListObjectVersionsCommand({ Bucket: bucket, Prefix: key }),
    { abortSignal: signal },
  );

  for (const version of [
    ...(versions.Versions ?? []),
    ...(versions.DeleteMarkers ?? []),
  ]) {
    if (version.Key === key)
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
          VersionId: version.VersionId,
        }),
        { abortSignal: signal },
      );
  }

  if (versions.IsTruncated) throw new Error("private file cleanup incomplete");
};
