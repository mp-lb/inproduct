import type { AppContext } from "@mp-lb/inproduct-server";

/** `isAdmin` is the demo's stand-in for real host authorization: loopback requests only. */
export type MyShopContext = AppContext & { isAdmin: boolean };
