import { createHash, randomUUID } from "node:crypto";
import type {
  ObjectDriver,
  ObjectInspection,
  Scanner,
} from "./fileLibraryContracts.js";

/** Synthetic versioned object store and fixture scanner for tests. Not malware protection.
 * `upload` simulates the client PUT to a signed URL; pass `overwrite` to model URL reuse. */
export const createSyntheticObjects = () => {
  const tickets = new Map<
    string,
    { key: string; checksum: string; sizeBytes: number; contentType: string }
  >();

  const versions = new Map<
    string,
    (ObjectInspection & { bytes: Uint8Array })[]
  >();

  const driver: ObjectDriver = {
    capabilities: { versioned: true, checksum: true, conditionalCreate: true },
    signUpload: async ({ key, metadata }) => {
      const token = randomUUID();
      tickets.set(token, { key, ...metadata });
      return {
        url: `https://synthetic.invalid/${token}`,
        headers: { "Content-Type": metadata.contentType },
      };
    },
    inspect: async (key, version) => {
      const found = version
        ? versions.get(key)?.find((entry) => entry.version === version)
        : versions.get(key)?.at(-1);

      if (!found) throw new Error("synthetic object missing");
      return {
        version: found.version,
        sizeBytes: found.sizeBytes,
        contentType: found.contentType,
        checksum: found.checksum,
      };
    },
    download: async ({ key, version }) => {
      const object = versions
        .get(key)
        ?.find((entry) => entry.version === version);

      if (!object) throw new Error("synthetic object missing");
      return {
        url: `data:application/octet-stream;base64,${Buffer.from(object.bytes).toString("base64")}`,
      };
    },
  };

  const scanner: Scanner = {
    scan: async ({ key, version, checksum, contentType }) => {
      const object = versions
        .get(key)
        ?.find((entry) => entry.version === version);

      if (!object || object.checksum !== checksum)
        throw new Error("synthetic scanner unavailable");
      const text = Buffer.from(object.bytes).toString();
      if (
        text.includes("SYNTHETIC_REJECT") ||
        text.includes("<script") ||
        (contentType === "application/pdf" && !text.startsWith("%PDF-"))
      )
        return "rejected";
      return "clean";
    },
  };

  const upload = (url: string, bytes: Uint8Array, overwrite = false) => {
    const ticket = tickets.get(new URL(url).pathname.slice(1));
    if (!ticket) throw new Error("unknown synthetic ticket");
    if (!overwrite && versions.has(ticket.key))
      throw new Error("synthetic conditional write failed");

    const object = {
      version: randomUUID(),
      sizeBytes: bytes.byteLength,
      contentType: ticket.contentType,
      checksum: createHash("sha256").update(bytes).digest("hex"),
      bytes,
    };

    versions.set(ticket.key, [...(versions.get(ticket.key) ?? []), object]);
    return object.version;
  };

  const readVersion = async (key: string, version: string) => {
    const object = versions
      .get(key)
      ?.find((entry) => entry.version === version);
    if (!object) throw new Error("synthetic object missing");
    return Buffer.from(object.bytes);
  };

  return { driver, scanner, upload, readVersion, versions };
};
