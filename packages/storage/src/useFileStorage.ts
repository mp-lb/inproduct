import { useCallback, useEffect, useRef, useState } from "react";
import type {
  FileMetadata,
  FilePage,
  FileQuery,
  FileStorageClient,
  FileUpload,
} from "./fileTypes.js";

const describeFailure = (error: unknown) =>
  error instanceof Error ? error.message : "File operation failed.";

/** Headless file explorer state. Keep the client stable (module scope or useState).
 * Operations return success booleans and expose failures as `error`; no event-handler catches needed.
 */
export const useFileStorage = (
  client: FileStorageClient,
  initialQuery: FileQuery = {},
) => {
  const [query, setQuery] = useState<FileQuery>(initialQuery);
  const [page, setPage] = useState<FilePage>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const sequence = useRef(0);
  const locked = useRef(false);
  const currentClient = useRef(client);
  const latestQuery = useRef(query);

  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true);
    setError(undefined);

    try {
      const result = await client.list(latestQuery.current);
      if (request !== sequence.current || client !== currentClient.current)
        return;
      // Deleting the final row on a later page returns to the first page.
      if (!result.items.length && (latestQuery.current.offset ?? 0) > 0) {
        setQuery((value) => ({ ...value, offset: 0 }));
      } else setPage(result);
    } catch (failure) {
      if (request === sequence.current && client === currentClient.current) {
        setPage(undefined);
        setError(describeFailure(failure));
      }
    } finally {
      if (request === sequence.current && client === currentClient.current)
        setLoading(false);
    }
  }, [client]);

  const invalidate = useCallback(() => {
    sequence.current++;
  }, []);

  const mounted = useRef(false);
  useEffect(() => {
    currentClient.current = client;
    latestQuery.current = query;
    mounted.current = true;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void refresh();
    });

    return () => {
      cancelled = true;
      mounted.current = false;
      invalidate();
    };
  }, [client, refresh, query, invalidate]);

  const run = async (operation: () => Promise<unknown>, reload = true) => {
    if (locked.current) return false;
    locked.current = true;
    setBusy(true);
    setError(undefined);

    try {
      await operation();
      if (mounted.current && client === currentClient.current && reload)
        await refresh();
      return true;
    } catch (failure) {
      if (mounted.current && client === currentClient.current)
        setError(describeFailure(failure));
      return false;
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  return {
    files: page?.items ?? [],
    total: page?.total ?? 0,
    usage: page?.usage,
    loading,
    busy,
    error,
    query,
    refresh,
    setFilters: (filters: Pick<FileQuery, "search" | "tag">) => {
      sequence.current++;
      setQuery((value) => ({ ...value, ...filters, offset: 0 }));
    },
    hasNextPage: page?.nextOffset != null,
    nextPage: () => {
      if (page?.nextOffset != null)
        setQuery((value) => ({ ...value, offset: page.nextOffset! }));
    },
    firstPage: () => setQuery((value) => ({ ...value, offset: 0 })),
    upload: (input: FileUpload) => run(() => client.upload(input)),
    uploadFile: (file: File, metadata: Partial<FileMetadata> = {}) =>
      run(async () => {
        const body = new Uint8Array(await file.arrayBuffer());
        await client.upload({
          body,
          contentType: file.type,
          name: file.name,
          ...metadata,
        });
      }),
    edit: (id: string, metadata: FileMetadata) =>
      run(() => client.edit(id, metadata)),
    remove: (id: string) => run(() => client.remove(id)),
    download: (id: string) =>
      run(async () => {
        const object = await client.download(id);

        const url = URL.createObjectURL(
          new Blob([new Uint8Array(object.body)], { type: object.contentType }),
        );

        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = object.name;
        document.body.append(anchor);

        try {
          anchor.click();
        } finally {
          anchor.remove();
          // Let the browser consume the download before releasing the blob.
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      }, false),
  };
};
