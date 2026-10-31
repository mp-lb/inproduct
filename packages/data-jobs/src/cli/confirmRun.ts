import type { DataJobPreview } from "../dataJobTypes.js";
import type { CliIo } from "./cliIo.js";

/** Confirms a previewed run: `--yes` confirms up front, otherwise the operator types the job ID. */
export const confirmRun = async (
  preview: DataJobPreview,
  { yes, interactive }: { yes: boolean; interactive: boolean },
  io: CliIo,
) => {
  if (yes) return true;

  if (!interactive || !io.ask) {
    io.writeError(
      "Confirmation required. Pass --yes after reviewing the preview.",
    );

    return false;
  }

  const answer = await io.ask(`Type ${preview.job.id} to run this job: `);
  if (answer.trim() === preview.job.id) return true;
  io.writeError("Confirmation did not match. Nothing was run.");
  return false;
};
