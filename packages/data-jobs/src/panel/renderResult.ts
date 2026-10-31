import type { DataJobResult } from "../dataJobTypes.js";
import { createElement } from "./createElement.js";
import { renderVerification } from "./renderVerification.js";

/** Honest final state: outcome, verification and, on failure, whether rerunning is safe. */
export const renderResult = (document: Document, result: DataJobResult) =>
  createElement(
    document,
    "section",
    {
      class: `data-job-result ${result.status}`,
      "aria-label": "Latest run",
      role: result.status === "failed" ? "alert" : undefined,
    },
    [
      createElement(document, "h4", {}, [
        result.status === "succeeded" ? "Run succeeded" : "Run failed",
      ]),
      result.outcome &&
        createElement(document, "p", {}, [result.outcome.summary]),
      ...(result.outcome?.changes ?? []).map((change) =>
        createElement(document, "p", {}, [`${change.label}: ${change.count}`]),
      ),
      result.verification && renderVerification(document, result.verification),
      result.status === "failed" &&
        createElement(document, "p", {}, [`Error: ${result.error}`]),
      result.status === "failed" &&
        createElement(document, "p", {}, [
          result.rerunSupported
            ? "Rerun is supported after fixing the cause."
            : "Rerun is not supported. Recover manually before running again.",
        ]),
    ],
  );
