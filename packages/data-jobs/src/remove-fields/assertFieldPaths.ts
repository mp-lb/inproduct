const segmentProblem = (segment: string) => {
  if (!segment) return "has an empty segment";
  if (segment.startsWith("$")) return "uses an operator segment";
  if (/^\d+$/.test(segment)) return "uses an array index segment";
  if (segment.includes("\0")) return "contains a null character";
  return undefined;
};

const pathProblem = (path: string) => {
  if (!path.trim()) return "is empty";
  if (path.length > 200) return "is longer than 200 characters";
  const segments = path.split(".");
  if (segments[0] === "_id") return "targets _id";

  for (const segment of segments) {
    const problem = segmentProblem(segment);
    if (problem) return problem;
  }

  return undefined;
};

const overlaps = (left: string, right: string) =>
  left === right ||
  left.startsWith(`${right}.`) ||
  right.startsWith(`${left}.`);

/** Accepts dot-separated object paths only. Array indexes, positional operators,
 * `_id` and paths that overlap each other are rejected.
 * @throws TypeError naming the first unsupported path.
 */
export const assertFieldPaths = (fields: readonly string[]) => {
  if (!fields.length)
    throw new TypeError("at least one field path is required");
  fields.forEach((field, index) => {
    const problem = pathProblem(field);
    if (problem) throw new TypeError(`field path "${field}" ${problem}`);

    const other = fields
      .slice(0, index)
      .find((value) => overlaps(value, field));

    if (other !== undefined)
      throw new TypeError(`field paths "${other}" and "${field}" overlap`);
  });
};
