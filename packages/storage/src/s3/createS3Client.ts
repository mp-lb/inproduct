import { S3Client } from "@aws-sdk/client-s3";
import type { S3Connection } from "./s3Connection.js";

/** Path-style addressing for custom endpoints; checksums only when the request requires one. */
export const createS3Client = (connection: S3Connection) =>
  new S3Client({
    region: connection.region,
    endpoint: connection.endpoint,
    credentials: connection.credentials,
    forcePathStyle: Boolean(connection.endpoint),
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
