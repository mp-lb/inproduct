import { afterEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:net";
import { createHash } from "node:crypto";
import { createClamdScanner } from "../createClamdScanner";
import { scanPrivateFileBytes } from "../scanPrivateFileBytes";
const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map(
        (server) =>
          new Promise<void>((resolve) => server.close(() => resolve())),
      ),
  );
});

const endpoint = async (version: string, verdict: string | null) => {
  const server = createServer((socket) => {
    let buffer = Buffer.alloc(0);
    let stream = false;
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);

      if (!stream) {
        const end = buffer.indexOf(0);
        if (end < 0) return;
        const command = buffer.subarray(0, end).toString();
        buffer = buffer.subarray(end + 1);

        if (command === "zVERSION") {
          socket.end(version + "\0");
          return;
        }

        stream = true;
      }

      while (buffer.length >= 4) {
        const size = buffer.readUInt32BE(0);
        if (buffer.length < size + 4) return;
        buffer = buffer.subarray(size + 4);

        if (size === 0) {
          socket.end(verdict === null ? "partial response" : verdict + "\0");
          return;
        }
      }
    });
  });

  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("test socket missing");
  return `tcp://127.0.0.1:${address.port}`;
};

const bytes = Buffer.from("synthetic protocol fixture");

const input = {
  key: "files/test",
  version: "immutable-test-version",
  checksum: createHash("sha256").update(bytes).digest("hex"),
  contentType: "text/plain",
};

const fresh = `ClamAV 1.4.0/12345/${new Date().toUTCString()}`;
describe("scanner fail-closed protocol", () => {
  it.each([
    "ClamAV 1.4.0",
    "ClamAV 1.4.0/12345/Mon, 01 Jan 2001 00:00:00 GMT",
    "invalid",
  ])("rejects missing/stale version metadata: %s", async (version) => {
    const scanner = createClamdScanner({
      endpoint: await endpoint(version, "stream: OK"),
      readVersion: async () => {
        throw new Error("must not fetch without fresh scanner");
      },
    });

    await expect(scanner.scan(input)).rejects.toThrow("signatures");
  });

  it.each(["stream: size limit exceeded. ERROR", "unexpected", null])(
    "never marks an incomplete or error verdict clean: %s",
    async (verdict) => {
      const scanner = createClamdScanner({
        endpoint: await endpoint(fresh, verdict),
        readVersion: async () => bytes,
      });

      await expect(scanner.scan(input)).rejects.toThrow();
    },
  );

  it("verifies immutable bytes and declared type independently of a clean scanner reply", async () => {
    const scanner = createClamdScanner({
      endpoint: await endpoint(fresh, "stream: OK"),
      readVersion: async () => bytes,
    });

    expect(await scanner.scan({ ...input, checksum: "0".repeat(64) })).toBe(
      "rejected",
    );

    expect(await scanner.scan({ ...input, contentType: "image/png" })).toBe(
      "rejected",
    );
  });

  it("honors cancellation", async () => {
    const scanner = createClamdScanner({
      endpoint: await endpoint(fresh, "stream: OK"),
      readVersion: async () => bytes,
    });

    const controller = new AbortController();
    controller.abort();
    await expect(
      scanner.scan({ ...input, signal: controller.signal }),
    ).rejects.toThrow("canceled");
  });

  it("returns clean and rejected verdicts for exact bytes", async () => {
    const clean = createClamdScanner({
      endpoint: await endpoint(fresh, "stream: OK"),
      readVersion: async () => bytes,
    });

    expect(await clean.scan(input)).toBe("clean");

    const infected = createClamdScanner({
      endpoint: await endpoint(fresh, "stream: Eicar-Test-Signature FOUND"),
      readVersion: async () => bytes,
    });

    expect(await infected.scan(input)).toBe("rejected");
  });

  it("scans arbitrary private attachment bytes and refuses non-OK verdicts", async () => {
    const signal = AbortSignal.timeout(5000);
    await scanPrivateFileBytes(
      await endpoint(fresh, "stream: OK"),
      bytes,
      signal,
    );

    await expect(
      scanPrivateFileBytes(
        await endpoint(fresh, "stream: Eicar-Test-Signature FOUND"),
        bytes,
        signal,
      ),
    ).rejects.toThrow("did not pass malware scanning");
  });
});
