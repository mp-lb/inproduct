export type CliIo = {
  write: (text: string) => void;
  writeError: (text: string) => void;
  /** Asks a question on an interactive terminal; undefined when no terminal is attached. */
  ask?: (question: string) => Promise<string>;
};
