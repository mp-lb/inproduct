import type { CliIo } from "../cli/cliIo";

export const createTestIo = (answers: string[] = []) => {
  const out: string[] = [];
  const err: string[] = [];

  const io: CliIo = {
    write: (text) => out.push(text),
    writeError: (text) => err.push(text),
    ask: async () => answers.shift() ?? "",
  };

  return { io, out, err };
};
