import type { ContentDetection } from "./fileTypeContracts.js";
import { officeOpenXmlParts } from "./contentContainers.js";
import { latin1 } from "./latin1.js";
import { startsWithAt } from "./startsWithAt.js";

const window = 65_536;

/** ZIP archives, refined by an uncompressed ODF/EPUB `mimetype` entry or Office
 * Open XML part names in local headers and the central directory. */
export const detectZipContent = (
  bytes: Uint8Array,
): ContentDetection | null => {
  if (
    ![
      [80, 75, 3, 4],
      [80, 75, 5, 6],
      [80, 75, 7, 8],
    ].some((signature) => startsWithAt(bytes, signature))
  )
    return null;

  const types = ["application/zip"];

  if (startsWithAt(bytes, "mimetype", 30)) {
    const declared = /^[a-z0-9.+-]+\/[a-z0-9.+-]+/.exec(latin1(bytes, 38, 138));
    if (declared) types.push(declared[0]);
  }

  const names =
    latin1(bytes, 0, window) +
    latin1(bytes, Math.max(window, bytes.length - window));

  for (const part of officeOpenXmlParts)
    if (names.includes(part.marker)) types.push(...part.types);
  return { types, container: "zip" };
};
