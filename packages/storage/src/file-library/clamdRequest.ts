import { createConnection } from "node:net";

// Clamd TCP has no authentication/TLS: endpoint must be a trusted private host.
export const clamdRequest = (
  endpoint: string,
  command: "VERSION" | "INSTREAM",
  bytes?: Buffer,
  signal?: AbortSignal,
): Promise<string> => {
  const url = new URL(endpoint);
  if (
    url.protocol !== "tcp:" ||
    !url.hostname ||
    !url.port ||
    url.username ||
    url.password ||
    (url.pathname && url.pathname !== "/")
  )
    throw new Error("invalid private scanner endpoint");
  return new Promise((resolve, reject) => {
    const socket = createConnection({
      host: url.hostname,
      port: Number(url.port),
    });

    let result = "";
    let settled = false;
    let requestComplete = command === "VERSION";

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      socket.destroy();
      if (error) reject(error);
      else resolve(result.slice(0, result.indexOf("\0")));
    };

    const abort = () => finish(new Error("scanner request canceled"));

    const timer = setTimeout(
      () => finish(new Error("scanner request timed out")),
      25_000,
    );

    signal?.addEventListener("abort", abort, { once: true });
    socket.on("error", () => finish(new Error("scanner unavailable")));
    socket.on("close", () => {
      if (!settled) finish(new Error("incomplete scanner reply"));
    });

    socket.on("data", (chunk: Buffer) => {
      result += chunk.toString("utf8");
      if (result.length > 4096) finish(new Error("invalid scanner reply"));
      else if (result.includes("\0"))
        finish(
          requestComplete ? undefined : new Error("premature scanner verdict"),
        );
    });

    socket.once("connect", () => {
      void (async () => {
        const write = (chunk: Buffer) =>
          new Promise<void>((done, fail) =>
            socket.write(chunk, (error) => (error ? fail(error) : done())),
          );

        await write(Buffer.from(`z${command}\0`));

        if (command === "INSTREAM") {
          if (!bytes) throw new Error("missing scan bytes");

          for (let offset = 0; offset < bytes.length; offset += 65536) {
            if (settled) return;
            const chunk = bytes.subarray(offset, offset + 65536);
            const length = Buffer.alloc(4);
            length.writeUInt32BE(chunk.length);
            await write(length);
            await write(chunk);
          }

          requestComplete = true;
          await write(Buffer.alloc(4));
        }
      })().catch(() => finish(new Error("scanner stream failed")));
    });

    if (signal?.aborted) abort();
  });
};
