import { createTrpc } from "@mp-lb/fssstack-platform/trpc";
import { TRPCError } from "@trpc/server";
import type { MyShopContext } from "./myShopContext";

const t = createTrpc<MyShopContext>();

export const router = t.router;

/** Every admin procedure checks authorization on the server, not only in the UI. */
export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.isAdmin)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required.",
    });
  return next();
});
