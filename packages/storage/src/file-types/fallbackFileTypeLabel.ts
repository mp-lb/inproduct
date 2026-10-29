/** A readable label for types without a curated one, such as `KML file`. */
export const fallbackFileTypeLabel = (id: string, extensions: string[]) => {
  if (extensions[0]) return `${extensions[0].toUpperCase()} file`;
  const subtype = id.split("/")[1] ?? id;

  const name = subtype
    .replace(/^(?:vnd|x|prs)[.-]/, "")
    .split("+")[0]!
    .split(".")
    .at(-1)!;

  return `${name.toUpperCase()} file`;
};
