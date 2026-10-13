import type { IncomingMessage } from "node:http";
import { Buffer } from "node:buffer";
import { FileStorageError } from "./FileStorageError.js";

export const readFileRequest = async (
  request: IncomingMessage,
  maxBytes: number,
): Promise<Request> => {
  const declared = Number(request.headers["content-length"]);
  if (declared > maxBytes)
    throw new FileStorageError("TOO_LARGE", "request body is too large");
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);
    size += bytes.length;
    if (size > maxBytes)
      throw new FileStorageError("TOO_LARGE", "request body is too large");
    chunks.push(bytes);
  }

  return new Request("http://localhost", {
    method: request.method,
    headers: { "content-type": request.headers["content-type"] ?? "" },
    body: Buffer.concat(chunks),
  });
};
