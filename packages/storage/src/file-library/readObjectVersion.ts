/** Reads the exact bytes of one immutable object version. */
export type ReadObjectVersion = (
  key: string,
  version: string,
  signal?: AbortSignal,
) => Promise<Buffer>;
