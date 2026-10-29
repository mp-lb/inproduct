import type { ContentDetection } from "./fileTypeContracts.js";
import { latin1 } from "./latin1.js";
import { startsWithAt } from "./startsWithAt.js";

const forms: Record<string, string> = {
  WEBP: "image/webp",
  WAVE: "audio/wav",
  "AVI ": "video/x-msvideo",
};

/** RIFF containers by form type. Unknown forms are not recognized. */
export const detectRiffContent = (
  bytes: Uint8Array,
): ContentDetection | null => {
  const form = forms[latin1(bytes, 8, 12)];
  return startsWithAt(bytes, "RIFF") && form
    ? { types: [form], container: null }
    : null;
};
