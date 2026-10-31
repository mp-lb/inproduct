import type { DataJobsClient } from "../dataJobTypes";
import type { DataJobRunner } from "../runner/createDataJobRunner";

/** Exposes a runner through the client contract, as a host's tRPC router would. */
export const createRunnerClient = (runner: DataJobRunner): DataJobsClient => ({
  list: async () => runner.list(),
  inspect: (id) => runner.inspect(id),
  run: (request) => runner.run(request),
  verify: (id) => runner.verify(id),
});
