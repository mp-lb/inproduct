/** Whether `bytes` contains `expected` (a latin1 string or byte list) at `offset`. */
export const startsWithAt = (
  bytes: Uint8Array,
  expected: string | number[],
  offset = 0,
) => {
  const values =
    typeof expected === "string"
      ? Array.from(expected, (character) => character.charCodeAt(0))
      : expected;

  return (
    bytes.length >= offset + values.length &&
    values.every((value, index) => bytes[offset + index] === value)
  );
};
