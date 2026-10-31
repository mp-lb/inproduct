import type {
  DataJobPreview,
  DataJobResult,
  DataJobRunRequest,
  DataJobSummary,
  DataJobVerification,
  DataJobsClient,
} from "./dataJobTypes.js";

/** The procedures a host's authorized tRPC data-jobs router exposes. */
export type DataJobsTRPCProxy = {
  list: { query(): Promise<DataJobSummary[]> };
  inspect: { mutate(input: { id: string }): Promise<DataJobPreview> };
  run: { mutate(input: DataJobRunRequest): Promise<DataJobResult> };
  verify: { query(input: { id: string }): Promise<DataJobVerification> };
};

/** Adapts an authorized tRPC proxy to the client used by the Data jobs panel.
 * The host owns the router, authentication and authorization.
 */
export const createDataJobsTRPCClient = (
  router: DataJobsTRPCProxy,
): DataJobsClient => ({
  list: () => router.list.query(),
  inspect: (id) => router.inspect.mutate({ id }),
  run: (request) => router.run.mutate(request),
  verify: (id) => router.verify.query({ id }),
});
