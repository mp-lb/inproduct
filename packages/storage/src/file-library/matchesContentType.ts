/** Positive content detection for the library's accepted types. Never trusts upload MIME. */
export const matchesContentType = (bytes: Buffer, type: string) => {
  if (type === "application/pdf")
    return bytes.subarray(0, 5).toString() === "%PDF-";
  if (type === "image/png")
    return bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (type === "image/jpeg")
    return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type !== "text/plain") return false;

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);

    for (let index = 0; index < text.length; index++) {
      const code = text.charCodeAt(index);
      if (code < 32 && code !== 9 && code !== 10 && code !== 13) return false;
    }

    return !/<\s*(?:html|svg|script)\b/i.test(text);
  } catch {
    return false;
  }
};
