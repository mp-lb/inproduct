import { CommanderError } from "commander";
import type { DataJobRunner } from "../runner/createDataJobRunner.js";
import { describeFailure } from "../runner/describeFailure.js";
import type { CliIo } from "./cliIo.js";
import { createDataJobsProgram } from "./createDataJobsProgram.js";
import { createProcessIo } from "./createProcessIo.js";

export type DataJobsCliOptions = {
  runner: DataJobRunner;
  /** Arguments after the script name. Defaults to `process.argv.slice(2)`. */
  args?: string[];
  name?: string;
  version?: string;
  io?: CliIo;
};

/** Runs the data-jobs command line against a host-built runner and resolves with an exit code.
 * Build the runner from job definitions and a database connection only, so the CLI keeps
 * working when the full application cannot start.
 * @example
 * process.exitCode = await runDataJobsCli({ runner });
 */
export const runDataJobsCli = async ({
  runner,
  args = process.argv.slice(2),
  name = "data-jobs",
  version = "0.0.0",
  io = createProcessIo(),
}: DataJobsCliOptions) => {
  let code = 0;

  const output = (json: boolean, value: unknown, human: string) =>
    io.write(json ? JSON.stringify(value, null, 2) : human);

  const program = createDataJobsProgram(
    { runner, io, output },
    { name, version, exit: (value) => (code = value) },
  );

  try {
    await program.parseAsync(args, { from: "user" });
    return code;
  } catch (error) {
    if (error instanceof CommanderError) return error.exitCode;
    io.writeError(`Error: ${describeFailure(error)}`);
    return 1;
  }
};
