/** Provider connection supplied by host configuration, never by API callers. */
export type S3Connection = {
  bucket: string;
  region: string;
  endpoint?: string;
  credentials?: { accessKeyId: string; secretAccessKey: string };
};
