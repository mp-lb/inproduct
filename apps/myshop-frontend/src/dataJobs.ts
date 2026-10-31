import { createDataJobsTRPCClient } from "@mp-lb/inproduct-data-jobs/trpc";
import type { MyShopRouter } from "@mp-lb/inproduct-myshop-backend/trpc";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";

const trpc = createTRPCClient<MyShopRouter>({
  links: [httpBatchLink({ url: "/api/trpc", transformer: superjson })],
});

export const dataJobs = createDataJobsTRPCClient(trpc.dataJobs);
