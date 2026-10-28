/** Host-owned keys with version-pinned reads. The bucket and credentials are never accepted from API callers. */
export type VersionedDocumentStorage = {
  prepareUpload(input: {
    key: string;
    contentType: string;
    sizeBytes: number;
  }): Promise<{
    url: string;
    headers: Record<string, string>;
    expiresInSeconds: number;
  }>;
  inspect(
    key: string,
  ): Promise<{ sizeBytes: number; contentType: string; versionId: string }>;
  prepareDownload(input: {
    key: string;
    versionId: string;
    fileName: string;
  }): Promise<{ url: string; expiresInSeconds: number }>;
};
