/** `MYSHOP_MONGO_URI`, else the local Zap MongoDB service, else undefined (no data jobs). */
export const readMongoUri = (environment = process.env) => {
  if (environment.MYSHOP_MONGO_URI) return environment.MYSHOP_MONGO_URI;
  const port = Number(environment.MONGO_PORT);
  return Number.isInteger(port) && port > 0 && port <= 65535
    ? `mongodb://127.0.0.1:${port}/?directConnection=true`
    : undefined;
};
