import type { CliContext } from "./cliContext.js";
import { confirmRun } from "./confirmRun.js";
import { renderPreview } from "./renderPreview.js";
import { renderResult } from "./renderResult.js";

export type RunOptions = {
  yes?: boolean;
  acceptDataLoss?: boolean;
  noninteractive?: boolean;
  json?: boolean;
};

/** Inspects, confirms and runs one job. Resolves with the process exit code. */
export const runAction = async (
  { runner, io, output }: CliContext,
  id: string,
  options: RunOptions,
) => {
  const json = options.json === true;
  const preview = await runner.inspect(id);
  if (!json) io.write(renderPreview(preview));

  if (preview.job.destructive && !options.acceptDataLoss) {
    io.writeError("This job deletes data. Pass --accept-data-loss to run it.");
    return 1;
  }

  const confirmed = await confirmRun(
    preview,
    { yes: options.yes === true, interactive: !options.noninteractive },
    io,
  );

  if (!confirmed) return 1;

  const result = await runner.run(
    {
      id,
      confirmationToken: preview.confirmationToken,
      acceptDataLoss: options.acceptDataLoss === true,
    },
    json
      ? undefined
      : ({ completed, total }) =>
          io.writeError(
            `Progress: ${completed}${total === undefined ? "" : ` of ${total}`}`,
          ),
  );

  output(json, { preview, result }, renderResult(result));
  return result.status === "succeeded" ? 0 : 1;
};
