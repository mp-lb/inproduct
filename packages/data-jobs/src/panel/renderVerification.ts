import type { DataJobVerification } from "../dataJobTypes.js";
import { createElement } from "./createElement.js";

export const renderVerification = (
  document: Document,
  verification: DataJobVerification,
) =>
  createElement(
    document,
    "p",
    { class: verification.passed ? "data-job-passed" : "data-job-failed" },
    [
      `Verification ${verification.passed ? "passed" : "failed"}: ${verification.summary}`,
    ],
  );
