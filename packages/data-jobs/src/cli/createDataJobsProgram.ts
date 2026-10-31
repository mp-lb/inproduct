import { Command } from "commander";
import type { CliContext } from "./cliContext.js";
import { renderPreview } from "./renderPreview.js";
import { renderSummaries } from "./renderSummaries.js";
import { renderVerification } from "./renderVerification.js";
import { runAction, type RunOptions } from "./runAction.js";

type JsonOption = { json?: boolean };

/** Builds the command tree. Actions report their exit code through `exit`. */
export const createDataJobsProgram = (
  context: CliContext,
  {
    name,
    version,
    exit,
  }: { name: string; version: string; exit: (code: number) => void },
) => {
  const { runner, output } = context;

  const program = new Command(name)
    .description("Inspect, run and verify registered data jobs.")
    .version(version)
    // Subcommands inherit these settings only when configured before they are added.
    .exitOverride()
    .configureOutput({
      writeOut: (text) => context.io.write(text.trimEnd()),
      writeErr: (text) => context.io.writeError(text.trimEnd()),
    });

  program
    .command("version")
    .description("Print the version.")
    .action(() => context.io.write(version));

  program
    .command("list")
    .description("List registered data jobs.")
    .option("--json", "print JSON")
    .action(({ json }: JsonOption) => {
      const jobs = runner.list();
      output(json === true, jobs, renderSummaries(jobs));
    });

  program
    .command("inspect")
    .description("Preview what a job would change without changing data.")
    .argument("<id>", "registered job ID")
    .option("--json", "print JSON")
    .action(async (id: string, { json }: JsonOption) => {
      const preview = await runner.inspect(id);
      // Inspection is read-only here; its confirmation token is never shown or used.
      const data = { job: preview.job, inspection: preview.inspection };
      output(json === true, data, renderPreview(preview));
    });

  program
    .command("run")
    .description("Inspect, confirm and run a job, then verify it.")
    .argument("<id>", "registered job ID")
    .option("-y, --yes", "confirm the previewed run without prompting")
    .option("--accept-data-loss", "required for jobs that delete data")
    .option("--noninteractive", "never prompt; fail unless --yes is given")
    .option("--json", "print JSON")
    .action(async (id: string, options: RunOptions) =>
      exit(await runAction(context, id, options)),
    );

  program
    .command("verify")
    .description("Check that a job's changes are complete.")
    .argument("<id>", "registered job ID")
    .option("--json", "print JSON")
    .action(async (id: string, { json }: JsonOption) => {
      const verification = await runner.verify(id);
      output(json === true, verification, renderVerification(verification));
      exit(verification.passed ? 0 : 1);
    });

  return program;
};
