import { runDataJobsCli } from "@mp-lb/inproduct-data-jobs/cli";
import { createMyShopDataJobRunner } from "./createMyShopDataJobRunner";
import { readMongoUri } from "./data-jobs/readMongoUri";

// Deliberately independent of the HTTP server, storage and frontend: only job definitions
// and a database connection load, so this works when the application itself cannot start.
const uri = readMongoUri();

if (!uri) {
  process.stderr.write(
    "Run through `zap task myshop-data-jobs` so MONGO_PORT is set.\n",
  );

  process.exitCode = 1;
} else {
  const { client, runner } = createMyShopDataJobRunner(uri);

  try {
    process.exitCode = await runDataJobsCli({
      runner,
      name: "myshop-data-jobs",
    });
  } finally {
    await client.close();
  }
}
