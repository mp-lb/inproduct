/** Candidate `{ stem, extension }` splits of a file name, longest extension first
 * (at most three segments). Leading-dot names such as `.env` have no extension. */
export const splitFileNameSuffixes = (fileName: string) => {
  const segments = fileName.trim().split(".");
  const splits: { stem: string; extension: string }[] = [];

  for (let count = Math.min(3, segments.length - 1); count >= 1; count--) {
    const stem = segments.slice(0, -count).join(".").trim();
    if (stem)
      splits.push({
        stem,
        extension: segments.slice(-count).join(".").toLowerCase(),
      });
  }

  return splits;
};
