import {
  dataJobRequestSchema,
  runDataJobSchema,
  type DataJobRunner,
} from "@mp-lb/inproduct-data-jobs";
import { AppError } from "@mp-lb/fssstack-platform/errors";
import { adminProcedure, router } from "./myShopTrpc";
import { toTRPCError } from "./toTRPCError";

const call = async <T>(
  runner: DataJobRunner | undefined,
  operation: (runner: DataJobRunner) => T | Promise<T>,
) => {
  if (!runner)
    throw new AppError({
      appCode: "FAILED_PRECONDITION",
      trpcCode: "PRECONDITION_FAILED",
      message:
        "Data jobs need the local MongoDB service. Start it with `zap up mongodb`.",
    }).toTrpcError();

  try {
    return await operation(runner);
  } catch (error) {
    throw toTRPCError(error);
  }
};

/** Inputs select a registered job only; collections, paths and filters stay in host code. */
export const createDataJobsRouter = (runner: DataJobRunner | undefined) =>
  router({
    list: adminProcedure.query(() => call(runner, (jobs) => jobs.list())),
    inspect: adminProcedure
      .input(dataJobRequestSchema)
      .mutation(({ input }) => call(runner, (jobs) => jobs.inspect(input.id))),
    run: adminProcedure.input(runDataJobSchema).mutation(({ ctx, input }) =>
      call(runner, async (jobs) => {
        const result = await jobs.run(input);
        ctx.logger.info("data_job.finished", {
          id: input.id,
          status: result.status,
          runId: result.runId,
        });

        return result;
      }),
    ),
    verify: adminProcedure
      .input(dataJobRequestSchema)
      .query(({ input }) => call(runner, (jobs) => jobs.verify(input.id))),
  });
