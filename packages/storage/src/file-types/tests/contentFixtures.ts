const ascii = (value: string) => Array.from(value, (c) => c.charCodeAt(0));

const bytesOf = (...parts: (string | number[])[]) =>
  new Uint8Array(
    parts.flatMap((part) => (typeof part === "string" ? ascii(part) : part)),
  );

const zipEntry = (name: string, body = "") =>
  bytesOf([80, 75, 3, 4], new Array(26).fill(0), name, body);

/** Minimal leading bytes for each detector. Enough to recognize, not valid files. */
export const contentFixtures = {
  pdf: bytesOf("%PDF-1.7\n%â\n"),
  png: bytesOf([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13]),
  jpeg: bytesOf([255, 216, 255, 224, 0, 16]),
  gif: bytesOf("GIF89a", [1, 0, 1, 0]),
  zip: zipEntry("notes/readme.txt"),
  docx: zipEntry("[Content_Types].xml", "word/document.xml"),
  odt: zipEntry("mimetype", "application/vnd.oasis.opendocument.textPK"),
  ole: bytesOf([208, 207, 17, 224, 161, 177, 26, 225, 0, 0]),
  mp4: bytesOf([0, 0, 0, 24], "ftypisom", [0, 0, 2, 0]),
  heic: bytesOf([0, 0, 0, 24], "ftypheic", [0, 0, 0, 0]),
  webp: bytesOf("RIFF", [36, 0, 0, 0], "WEBPVP8 "),
  wav: bytesOf("RIFF", [36, 0, 0, 0], "WAVEfmt "),
  webm: bytesOf([26, 69, 223, 163, 1, 0, 0, 0], "B\u0082webm"),
  exe: bytesOf("MZ", [144, 0, 3, 0, 0, 0, 4, 0, 0, 0, 255, 255]),
  binary: bytesOf([0, 159, 146, 150, 0, 1, 2]),
  text: bytesOf("Quarterly numbers\nRevenue\t12\n"),
  bmwText: bytesOf("BMW service notes\n"),
  mzText: bytesOf("MZ meeting minutes\n"),
  csv: bytesOf("name,total\nAda,3\n"),
  json: bytesOf('{"a": [1, 2]}'),
  xml: bytesOf('<?xml version="1.0"?><note/>'),
  html: bytesOf("Hello <script>alert(1)</script>"),
  svg: bytesOf('<svg xmlns="http://www.w3.org/2000/svg"/>'),
  typescript: bytesOf("export const answer: number = 42;\n"),
};
