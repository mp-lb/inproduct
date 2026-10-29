/** Reads a pinned object version, or the current object when version is null. */
export type ReadObjectVersion = (
  key: string,
  version: string | null,
  signal?: AbortSignal,
) => Promise<Buffer>;
