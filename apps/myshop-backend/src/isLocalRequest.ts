import type { IncomingMessage } from "node:http";

/** Local demo authorization: loopback host and same-origin browser requests only. */
export const isLocalRequest = (
  request: IncomingMessage,
  frontendOrigin: string,
) => {
  const host = request.headers.host;
  if (!host || !/^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(host))
    return false;
  if (request.headers["sec-fetch-site"] === "cross-site") return false;
  const origin = request.headers.origin;
  return (
    !origin ||
    origin === frontendOrigin ||
    origin === frontendOrigin.replace("127.0.0.1", "localhost") ||
    origin === `http://${host}`
  );
};
