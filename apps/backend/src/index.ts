import { createServer } from "node:http";
import {
  createCallerFactory,
  createContext,
  logger,
} from "@mp-lb/inproduct-server";
import { appRouter } from "@mp-lb/inproduct-trpc";

const serviceName = "backend";
const createCaller = createCallerFactory(appRouter);

export const createBackend = () =>
  createServer((request, response) => {
    if (request.url !== "/health") {
      response.writeHead(404, { "content-type": "application/json" });
      response.end(`${JSON.stringify({ error: "not_found" })}\n`);

      return;
    }

    const caller = createCaller(createContext());

    caller
      .greet({ name: serviceName })
      .then((greeting) => {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(`${JSON.stringify({ ok: true, ...greeting })}\n`);
      })
      .catch(() => {
        response.writeHead(500, { "content-type": "application/json" });
        response.end(`${JSON.stringify({ error: "internal" })}\n`);
      });
  });

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.BACKEND_PORT ?? 3101);
  const server = createBackend();

  server.listen(port, "0.0.0.0", () => {
    logger.info(
      "backend.listening",
      { port },
      { source: { service: serviceName } },
    );
  });
}
