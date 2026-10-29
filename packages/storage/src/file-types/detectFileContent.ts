import type { ContentDetection } from "./fileTypeContracts.js";
import { contentSignatures } from "./contentSignatures.js";
import { detectIsoBmffContent } from "./detectIsoBmffContent.js";
import { detectRiffContent } from "./detectRiffContent.js";
import { detectTextContent } from "./detectTextContent.js";
import { detectZipContent } from "./detectZipContent.js";
import { latin1 } from "./latin1.js";
import { startsWithAt } from "./startsWithAt.js";

const signature = (bytes: Uint8Array, weak: boolean) => {
  const found = contentSignatures.find(
    (entry) => !!entry.weak === weak && startsWithAt(bytes, entry.bytes, entry.offset),
  );

  if (!found) return null;
  if (found.container !== "ebml")
    return { types: found.types, container: found.container ?? null };

  const docType = latin1(bytes, 0, 64);
  return docType.includes("webm")
    ? { types: ["video/webm", "audio/webm"], container: "ebml" }
    : { types: found.types, container: "ebml" };
};

/**
 * Recognizes formats from leading bytes: binary signatures, ZIP/ISO-BMFF/RIFF
 * containers, then UTF-8 text, then short signatures plain text could start with.
 * Recognition is not validation: it never proves a file is well formed or safe.
 */
export const detectFileContent = (bytes: Uint8Array): ContentDetection =>
  detectZipContent(bytes) ??
  detectIsoBmffContent(bytes) ??
  detectRiffContent(bytes) ??
  signature(bytes, false) ??
  detectTextContent(bytes) ??
  signature(bytes, true) ?? { types: [], container: null };
