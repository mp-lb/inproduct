import type { DataJobRetryPolicy } from "./dataJobTypes.js";

export const describeRetryPolicy = (policy: DataJobRetryPolicy) =>
  policy === "safe_to_rerun"
    ? "Safe to rerun"
    : "Manual recovery required after a failure";
