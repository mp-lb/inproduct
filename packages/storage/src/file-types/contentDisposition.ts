import { sanitizeFileName } from "./sanitizeFileName.js";

const encode = (value: string) =>
  encodeURIComponent(value).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

/** RFC 6266 attachment header with an ASCII `filename` fallback and an RFC 5987
 * UTF-8 `filename*`. The name is sanitized first; CR/LF can never reach the header. */
export const contentDisposition = (fileName: string) => {
  const name = sanitizeFileName(fileName);
  const ascii = name.replace(/[^\x20-\x7e]|["\\%]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encode(name)}`;
};
