const reserved = /^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i;
const maxBytes = 200;

/**
 * A name safe to offer as a downloaded file name on common systems: Unicode NFC,
 * no control, bidirectional-override, path or reserved characters, no leading or
 * trailing dots and spaces, no Windows device names, at most 200 UTF-8 bytes.
 */
export const sanitizeFileName = (value: string, fallback = "file") => {
  let name = value
    .normalize("NFC")
    .replace(/[\u202a-\u202e\u2066-\u2069\u200e\u200f\u061c]/g, "")
    .replace(/[\u0000-\u001f\u007f-\u009f/\\:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .replace(/^[\s.]+|[\s.]+$/g, "");

  const encoder = new TextEncoder();
  while (encoder.encode(name).length > maxBytes)
    name = Array.from(name).slice(0, -1).join("").trimEnd();
  if (reserved.test(name)) name = `_${name}`;
  return name || fallback;
};
