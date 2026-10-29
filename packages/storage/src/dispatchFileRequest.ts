import type { IncomingMessage, ServerResponse } from "node:http";
import { FileStorageError } from "./FileStorageError.js";
import {
  fileMetadataSchema,
  fileQuerySchema,
  parseFileRequest,
} from "./fileRequestSchemas.js";
import { readFileRequest } from "./readFileRequest.js";
import type { FileStorageClient } from "./fileTypes.js";
import { contentDisposition } from "./file-types/contentDisposition.js";

export const dispatchFileRequest = async (
  request: IncomingMessage,
  response: ServerResponse,
  storage: FileStorageClient,
  path: string,
  maxRequestBytes: number,
) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const tail = url.pathname.slice(path.length);

  const send = (data: unknown, status = 200) => {
    response.writeHead(status, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });

    response.end(JSON.stringify(data));
  };

  if (tail === "" && request.method === "GET") {
    send(
      await storage.list(
        parseFileRequest(fileQuerySchema, Object.fromEntries(url.searchParams)),
      ),
    );

    return;
  }

  if (tail === "" && request.method === "POST") {
    const body = await readFileRequest(request, maxRequestBytes);
    let form: FormData;

    try {
      form = await body.formData();
    } catch {
      throw new FileStorageError("INVALID_INPUT", "invalid file upload");
    }

    const file = form.get("file");
    if (!(file instanceof File))
      throw new FileStorageError("INVALID_INPUT", "file is required");
    let tags: unknown;

    try {
      tags = JSON.parse(String(form.get("tags") ?? "[]"));
    } catch {
      throw new FileStorageError("INVALID_INPUT", "invalid file tags");
    }

    const metadata = parseFileRequest(fileMetadataSchema, {
      name: file.name,

      tags,
    });

    send(
      await storage.upload({
        ...metadata,
        body: new Uint8Array(await file.arrayBuffer()),
        contentType: file.type,
      }),
      201,
    );

    return;
  }

  if (tail === "") {
    response.writeHead(405, { allow: "GET, POST" });
    response.end();
    return;
  }

  const id = tail.slice(1);
  if (!/^\/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(tail))
    throw new FileStorageError("NOT_FOUND", "file not found");

  if (request.method === "GET") {
    const object = await storage.download(id);
    response.writeHead(200, {
      "content-type": "application/octet-stream",
      "content-disposition": contentDisposition(object.name),
      "x-file-name": encodeURIComponent(object.name),
      "x-file-content-type": encodeURIComponent(
        object.contentType ?? "application/octet-stream",
      ),
      "x-content-type-options": "nosniff",
      "cache-control": "no-store",
    });

    response.end(object.body);
    return;
  }

  if (request.method === "PATCH") {
    const body = await readFileRequest(
      request,
      Math.min(maxRequestBytes, 32 * 1024),
    );

    let metadata: unknown;

    try {
      metadata = await body.json();
    } catch {
      throw new FileStorageError("INVALID_INPUT", "invalid file metadata");
    }

    send(
      await storage.edit(id, parseFileRequest(fileMetadataSchema, metadata)),
    );

    return;
  }

  if (request.method === "DELETE") {
    await storage.remove(id);
    response.writeHead(204);
    response.end();
    return;
  }

  response.writeHead(405, { allow: tail ? "GET, PATCH, DELETE" : "GET, POST" });
  response.end();
};
