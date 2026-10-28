import { GetBucketVersioningCommand, type S3Client } from "@aws-sdk/client-s3";

export const assertBucketVersioning = async (
  client: S3Client,
  bucket: string,
  signal?: AbortSignal,
) => {
  const versioning = await client.send(
    new GetBucketVersioningCommand({ Bucket: bucket }),
    { abortSignal: signal },
  );

  if (versioning.Status !== "Enabled")
    throw new Error("storage bucket requires versioning");
};
