import { logger } from "@mp-lb/inproduct-server";
import { createMyShopBackend } from "./createMyShopBackend";
import { createMyShopDataJobRunner } from "./createMyShopDataJobRunner";
import { readMongoUri } from "./data-jobs/readMongoUri";

const port = Number(process.env.MYSHOP_BACKEND_PORT);
const frontendPort = Number(process.env.MYSHOP_FRONTEND_PORT);
if (
  ![port, frontendPort].every(
    (value) => Number.isInteger(value) && value > 0 && value <= 65535,
  )
)
  throw new Error(
    "Start MyShop through Zap to allocate its frontend and backend ports.",
  );

const mongoUri = readMongoUri();

const server = createMyShopBackend({
  frontendOrigin: `http://127.0.0.1:${frontendPort}`,
  dataJobs: mongoUri ? createMyShopDataJobRunner(mongoUri).runner : undefined,
});

server.listen(port, "127.0.0.1", () => {
  logger.info("myshop.listening", { port, dataJobs: Boolean(mongoUri) });
});
