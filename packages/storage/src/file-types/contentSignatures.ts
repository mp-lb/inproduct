export type ContentSignature = {
  bytes: string | number[];
  offset?: number;
  types: string[];
  container?: string;
  /** Short prefixes that plain text can start with; tried only on non-text bytes. */
  weak?: boolean;
};

/** Leading-byte signatures. Matching one recognizes a format; it does not prove
 * the rest of the file is well formed. RIFF, ISO-BMFF and ZIP have dedicated detectors. */
export const contentSignatures: ContentSignature[] = [
  { bytes: "%PDF-", types: ["application/pdf"] },
  { bytes: [137, 80, 78, 71, 13, 10, 26, 10], types: ["image/png"] },
  { bytes: [255, 216, 255], types: ["image/jpeg"] },
  { bytes: "GIF87a", types: ["image/gif"] },
  { bytes: "GIF89a", types: ["image/gif"] },
  { bytes: [73, 73, 42, 0], types: ["image/tiff"] },
  { bytes: [77, 77, 0, 42], types: ["image/tiff"] },
  { bytes: [0, 0, 1, 0], types: ["image/vnd.microsoft.icon"] },
  { bytes: "8BPS", types: ["image/vnd.adobe.photoshop"] },
  { bytes: [31, 139], types: ["application/gzip"] },
  { bytes: "BZh", types: ["application/x-bzip2"] },
  { bytes: [253, 55, 122, 88, 90, 0], types: ["application/x-xz"] },
  {
    bytes: [55, 122, 188, 175, 39, 28],
    types: ["application/x-7z-compressed"],
  },
  { bytes: [82, 97, 114, 33, 26, 7], types: ["application/vnd.rar"] },
  { bytes: "ustar", offset: 257, types: ["application/x-tar"] },
  { bytes: "ID3", types: ["audio/mpeg"] },
  { bytes: "fLaC", types: ["audio/flac"] },
  {
    bytes: "OggS",
    types: ["audio/ogg", "video/ogg", "application/ogg"],
    container: "ogg",
  },
  { bytes: "MThd", types: ["audio/midi"] },
  { bytes: "SQLite format 3\0", types: ["application/vnd.sqlite3"] },
  { bytes: [0, 97, 115, 109], types: ["application/wasm"] },
  { bytes: [127, 69, 76, 70], types: ["application/x-elf"] },
  { bytes: "%!PS", types: ["application/postscript"] },
  { bytes: "{\\rtf", types: ["application/rtf"] },
  { bytes: "wOFF", types: ["font/woff"] },
  { bytes: "wOF2", types: ["font/woff2"] },
  { bytes: "OTTO", types: ["font/otf"] },
  {
    bytes: [208, 207, 17, 224, 161, 177, 26, 225],
    types: [],
    container: "ole",
  },
  { bytes: [26, 69, 223, 163], types: ["video/x-matroska"], container: "ebml" },
  { bytes: [0, 1, 0, 0, 0], types: ["font/ttf"], weak: true },
  { bytes: "MZ", types: ["application/x-msdownload"], weak: true },
  { bytes: "BM", types: ["image/bmp"], weak: true },
  { bytes: [255, 251], types: ["audio/mpeg"], weak: true },
  { bytes: [255, 243], types: ["audio/mpeg"], weak: true },
  { bytes: [255, 242], types: ["audio/mpeg"], weak: true },
];
