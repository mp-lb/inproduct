import type { FilePage, FileStorageClient, StorageFile } from "./fileTypes.js";

/** Connect the headless hook to a mounted file API. Uses same-origin credentials by default.
 * Pass a fetch implementation to integrate your application's authentication.
 */
export const createFileStorageClient = (
  baseUrl = "/api/files",
  options: { fetch?: typeof globalThis.fetch } = {},
): FileStorageClient => {
  const fetcher = options.fetch ?? globalThis.fetch;
  const base = baseUrl.replace(/\/$/, "");

  const request = async (suffix: string, init?: RequestInit) => {
    const response = await fetcher(`${base}${suffix}`, init);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: unknown;
      } | null;

      throw new Error(
        typeof data?.error === "string"
          ? data.error
          : `File request failed (${response.status}).`,
      );
    }

    return response;
  };

  return {
    list: async (query = {}) => {
      const search = new URLSearchParams();
      for (const [key, value] of Object.entries(query))
        if (value !== undefined) search.set(key, String(value));
      return (await request(`?${search}`)).json() as Promise<FilePage>;
    },
    upload: async ({
      body,
      name,
      category = "general",
      tags = [],
      contentType,
    }) => {
      const form = new FormData();
      form.set(
        "file",
        new Blob([new Uint8Array(body)], { type: contentType }),
        name,
      );

      form.set("category", category);
      form.set("tags", JSON.stringify(tags));
      return (
        await request("", { method: "POST", body: form })
      ).json() as Promise<StorageFile>;
    },
    edit: async (id, metadata) =>
      (
        await request(`/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(metadata),
        })
      ).json() as Promise<StorageFile>,
    remove: async (id) => {
      await request(`/${encodeURIComponent(id)}`, { method: "DELETE" });
    },
    download: async (id) => {
      const response = await request(`/${encodeURIComponent(id)}`);
      return {
        body: new Uint8Array(await response.arrayBuffer()),
        name: decodeURIComponent(
          response.headers.get("x-file-name") ?? "download",
        ),
        contentType: decodeURIComponent(
          response.headers.get("x-file-content-type") ??
            "application/octet-stream",
        ),
      };
    },
  };
};
