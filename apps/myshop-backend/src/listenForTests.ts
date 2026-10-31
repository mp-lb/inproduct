import type { Server } from "node:http";

/** Listens on a free loopback port and resolves with the base URL. */
export const listenForTests = async (server: Server) => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("expected TCP address");
  return `http://127.0.0.1:${address.port}`;
};
