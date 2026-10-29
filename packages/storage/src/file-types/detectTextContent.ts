import type { ContentDetection } from "./fileTypeContracts.js";

const activeMarkup = /<\s*(?:html|svg|script)\b|<!doctype\s+html/i;

/** UTF-8 text without control characters other than tab, LF and CR. Text with
 * HTML, SVG or script markup is identified as that active format, not plain text. */
export const detectTextContent = (
  bytes: Uint8Array,
): ContentDetection | null => {
  if (!bytes.length) return null;
  let text: string;

  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }

  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    if ((code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127)
      return null;
  }

  if (activeMarkup.test(text))
    return {
      types: [/<\s*svg\b/i.test(text) ? "image/svg+xml" : "text/html"],
      container: "text",
    };

  const types = ["text/plain"];
  const start = text.trimStart();
  if (start.startsWith("<?xml")) types.push("application/xml");

  if (/^[[{]/.test(start) && bytes.length <= 5 * 1024 * 1024)
    try {
      JSON.parse(text);
      types.push("application/json");
    } catch {
      // Not JSON; still plain text.
    }

  return { types, container: "text" };
};
