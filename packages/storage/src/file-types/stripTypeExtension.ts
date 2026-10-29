import { splitFileNameSuffixes } from "./splitFileNameSuffixes.js";

/** Removes a trailing extension the file already has, so a rename to `Q3.pdf` on a
 * PDF stores `Q3` rather than producing `Q3.pdf.pdf`. Other suffixes are kept. */
export const stripTypeExtension = (name: string, extensions: string[]) =>
  splitFileNameSuffixes(name).find((split) =>
    extensions.includes(split.extension),
  )?.stem ?? name.trim();
