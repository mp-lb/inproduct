import {
  mkdir,
  readFile,
  readdir,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { join, resolve } from "node:path";
import { Buffer } from "node:buffer";
import { FileStorageError } from "./FileStorageError.js";
import { listFiles } from "./listFiles.js";
import type { FileStorageAdapter, StorageFile } from "./fileTypes.js";
import type { StoredObject } from "./types.js";

type DiskRecord = { file: StorageFile; body: string };

const isMissing = (error: unknown) =>
  error instanceof Error && "code" in error && error.code === "ENOENT";

/** Durable local storage with atomic file replacement. Use one adapter instance per directory.
 * Intended for a single-process backend, not shared/network filesystems. Each record buffers
 * its bytes and metadata together; listing reads records, so use a database adapter at scale.
 */
export const createDiskFileStorageAdapter = ({
  directory,
}: {
  directory: string;
}): FileStorageAdapter => {
  if (!directory.trim()) throw new TypeError("directory is required");
  const root = resolve(directory);
  let pending: Promise<unknown> = Promise.resolve();

  const serialize = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = pending.then(operation);
    pending = result.catch(() => undefined);
    return result;
  };

  const pathFor = (id: string) => {
    if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id))
      throw new FileStorageError("NOT_FOUND", "file not found");
    return join(root, `${id}.json`);
  };

  const read = async (id: string): Promise<DiskRecord | undefined> => {
    const path = pathFor(id);

    try {
      return JSON.parse(await readFile(path, "utf8")) as DiskRecord;
    } catch (error) {
      if (isMissing(error)) return undefined;
      throw error;
    }
  };

  const write = async (record: DiskRecord) => {
    const path = pathFor(record.file.id);
    await mkdir(root, { recursive: true, mode: 0o700 });
    const temporary = join(root, `.${crypto.randomUUID()}.tmp`);

    try {
      await writeFile(temporary, JSON.stringify(record), {
        flag: "wx",
        mode: 0o600,
      });

      await rename(temporary, path);
    } finally {
      await unlink(temporary).catch((error: unknown) => {
        if (!isMissing(error)) throw error;
      });
    }
  };

  return {
    insert: (file, object: StoredObject) => {
      const record = {
        file: structuredClone(file),
        body: Buffer.from(object.body).toString("base64"),
      };

      return serialize(async () => {
        if (await read(record.file.id)) throw new Error("file already exists");
        await write(record);
      });
    },
    get: async (id) => {
      const record = await read(id);
      return (
        record && {
          file: record.file,
          object: {
            body: new Uint8Array(Buffer.from(record.body, "base64")),
            contentType: record.file.contentType,
          },
        }
      );
    },
    update: (id, metadata, updatedAt) => {
      const snapshot = structuredClone(metadata);
      return serialize(async () => {
        const record = await read(id);
        if (!record) throw new FileStorageError("NOT_FOUND", "file not found");
        record.file = { ...record.file, ...snapshot, updatedAt };
        await write(record);
        return record.file;
      });
    },
    remove: (id) =>
      serialize(async () => {
        try {
          await unlink(pathFor(id));
        } catch (error) {
          if (!isMissing(error)) throw error;
        }
      }),
    list: async (query) => {
      const entries = await readdir(root).catch((error: unknown) => {
        if (isMissing(error)) return [];
        throw error;
      });

      const files: StorageFile[] = [];

      for (const entry of entries.filter((name) => name.endsWith(".json"))) {
        const record = await read(entry.slice(0, -5));
        if (record) files.push(record.file);
      }

      files.sort(
        (a, b) =>
          b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
      );

      return listFiles(files, query);
    },
  };
};
