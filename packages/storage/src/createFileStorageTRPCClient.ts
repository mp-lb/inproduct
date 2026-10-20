import type {
  FileMetadata,
  FilePage,
  FileQuery,
  FileStorageClient,
  StorageFile,
} from "./fileTypes.js";

/** The operations exposed by a host's authorized tRPC file router. */
export type FileStorageTRPCProxy = {
  list: { query(input: FileQuery): Promise<FilePage> };
  upload: {
    mutate(
      input: FileMetadata & { contentType: string; base64: string },
    ): Promise<StorageFile>;
  };
  edit: {
    mutate(input: FileMetadata & { id: string }): Promise<StorageFile>;
  };
  remove: { mutate(input: { id: string }): Promise<unknown> };
  download: {
    mutate(input: { id: string }): Promise<{
      name: string;
      contentType?: string;
      base64: string;
    }>;
  };
};

const encodeBytes = (body: Uint8Array) => {
  const chunks: string[] = [];
  for (let offset = 0; offset < body.length; offset += 32_768)
    chunks.push(String.fromCharCode(...body.subarray(offset, offset + 32_768)));
  return btoa(chunks.join(""));
};

const decodeBytes = (base64: string) =>
  Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));

/** Adapts an authorized tRPC proxy to the storage client and React hook.
 * The host supplies its own router, auth, request limit and binary transport.
 */
export const createFileStorageTRPCClient = (
  router: FileStorageTRPCProxy,
): FileStorageClient => ({
  list: (query) => router.list.query(query ?? {}),
  upload: (input) =>
    router.upload.mutate({
      name: input.name,
      category: input.category ?? "general",
      tags: input.tags ?? [],
      contentType: input.contentType ?? "application/octet-stream",
      base64: encodeBytes(input.body),
    }),
  edit: (id, metadata) => router.edit.mutate({ id, ...metadata }),
  remove: async (id) => {
    await router.remove.mutate({ id });
  },
  download: async (id) => {
    const response = await router.download.mutate({ id });
    return {
      name: response.name,
      contentType: response.contentType,
      body: decodeBytes(response.base64),
    };
  },
});
