/** Byte-for-byte latin1 view of a slice, for searching ASCII markers. */
export const latin1 = (bytes: Uint8Array, start = 0, end = bytes.length) => {
  let text = "";
  const stop = Math.min(end, bytes.length);
  for (let index = Math.max(0, start); index < stop; index += 8192)
    text += String.fromCharCode(
      ...bytes.subarray(index, Math.min(index + 8192, stop)),
    );
  return text;
};
