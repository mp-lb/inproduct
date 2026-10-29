import type { ContentDetection } from "./fileTypeContracts.js";
import { latin1 } from "./latin1.js";
import { startsWithAt } from "./startsWithAt.js";

const brands: [RegExp, string[]][] = [
  [/^(?:heic|heix|heim|heis|hevc|hevx)$/, ["image/heic"]],
  [/^(?:mif1|msf1)$/, ["image/heif"]],
  [/^(?:avif|avis)$/, ["image/avif"]],
  [/^qt {2}$/, ["video/quicktime"]],
  [/^M4[AB] $/, ["audio/mp4"]],
  [/^M4V[ HP]$/, ["video/x-m4v"]],
  [/^3gp/, ["video/3gpp"]],
  [/^3g2/, ["video/3gpp2"]],
];

/** ISO base media files (`ftyp` box), refined by major brand. */
export const detectIsoBmffContent = (
  bytes: Uint8Array,
): ContentDetection | null => {
  if (!startsWithAt(bytes, "ftyp", 4)) return null;
  const brand = latin1(bytes, 8, 12);
  const known = brands.find(([pattern]) => pattern.test(brand));
  return {
    types: known ? known[1] : ["video/mp4", "application/mp4"],
    container: "iso-bmff",
  };
};
