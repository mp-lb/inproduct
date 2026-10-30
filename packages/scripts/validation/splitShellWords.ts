export const splitShellWords = (input: string): string[] => {
  const words: string[] = [];
  let word = "";
  let quote = "";
  let started = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (char === "\\" && quote !== "'") {
      const next = input[++i];
      if (next === undefined)
        throw new Error("Unfinished escape in NODE_OPTIONS");
      if (quote === '"' && next !== '"' && next !== "\\") word += "\\";
      word += next;
      started = true;
    } else if (quote) {
      if (char === quote) quote = "";
      else word += char;
    } else if (char === "'" || char === '"') {
      quote = char;
      started = true;
    } else if (/\s/.test(char)) {
      if (started) words.push(word);
      word = "";
      started = false;
    } else {
      word += char;
      started = true;
    }
  }

  if (quote) throw new Error("Unclosed quote in NODE_OPTIONS");
  if (started) words.push(word);
  return words;
};
