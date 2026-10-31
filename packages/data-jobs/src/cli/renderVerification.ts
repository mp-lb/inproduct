import type { DataJobVerification } from "../dataJobTypes.js";

export const renderVerification = (verification: DataJobVerification) =>
  `Verification ${verification.passed ? "passed" : "failed"}: ${verification.summary}`;
