/** `a.b.c` → `["a", "a.b"]`. */
export const parentPaths = (path: string) => {
  const segments = path.split(".");
  return segments
    .slice(0, -1)
    .map((_, index) => segments.slice(0, index + 1).join("."));
};
