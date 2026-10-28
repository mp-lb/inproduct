/** Consumers own metadata, authorization and durable cleanup intents. Keys contain
 * opaque IDs only; objects are immutable and never shared between consumers. */
export type PrivateFileStore = {
  put(id: string, bytes: Uint8Array, signal: AbortSignal): Promise<void>;
  remove(id: string, signal: AbortSignal): Promise<void>;
  download(
    id: string,
    name: string,
  ): Promise<{ url: string; expiresAt: number }>;
};
