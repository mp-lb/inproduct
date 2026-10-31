import type { DataJobRunner } from "../runner/createDataJobRunner.js";
import type { CliIo } from "./cliIo.js";

export type CliContext = {
  runner: DataJobRunner;
  io: CliIo;
  /** Renders one value: JSON when requested, otherwise the human view. */
  output: (json: boolean, value: unknown, human: string) => void;
};
