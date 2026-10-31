import type { DataJobResult } from "../dataJobTypes.js";
import { renderVerification } from "./renderVerification.js";

export const renderResult = (result: DataJobResult) => {
  const lines = [`Run ${result.runId} ${result.status}.`];

  if (result.outcome) {
    lines.push(result.outcome.summary);
    for (const change of result.outcome.changes)
      lines.push(`  ${change.label}: ${change.count}`);
  }

  if (result.verification) lines.push(renderVerification(result.verification));
  if (result.status === "failed")
    lines.push(
      `Error: ${result.error}`,
      result.rerunSupported
        ? "Rerun is supported after fixing the cause."
        : "Rerun is not supported. Recover manually before running again.",
    );
  return lines.join("\n");
};
