import { splitShellWords } from "./splitShellWords";

export const validationEnvironment = (
  heapMiB = 2048,
  env = process.env,
): NodeJS.ProcessEnv => {
  const retained: string[] = [];
  let skip = false;

  for (const option of splitShellWords(env.NODE_OPTIONS ?? "")) {
    if (skip) {
      skip = false;
      continue;
    }

    const name = option.split("=", 1)[0].replaceAll("_", "-");
    if (
      ["--max-old-space-size", "--max-old-space-size-percentage"].includes(name)
    )
      skip = !option.includes("=");
    else retained.push(option);
  }

  retained.push(`--max-old-space-size=${heapMiB}`);
  return {
    ...env,
    NODE_OPTIONS: retained
      .map((value) => '"' + value.replaceAll('"', '\\"') + '"')
      .join(" "),
    TURBO_CONCURRENCY: "1",
  };
};
