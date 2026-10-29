import type { FileType } from "./fileTypeContracts.js";

const sourceRank = {
  custom: 0,
  inproduct: 1,
  iana: 2,
  apache: 3,
  nginx: 4,
  "mime-db": 5,
} as const;

/** Orders the types sharing an extension: an explicit preference, then custom
 * types, types whose preferred extension it is, source authority, and id. */
export const rankExtensionTypes = (
  extension: string,
  types: FileType[],
  preferred?: string,
) => {
  const key = (type: FileType) => [
    type.id === preferred ? 0 : 1,
    type.source === "custom" ? 0 : 1,
    type.extensions[0] === extension ? 0 : 1,
    type.id === "unknown" ? 1 : 0,
    sourceRank[type.source],
  ];

  return [...types].sort((left, right) => {
    const a = key(left);
    const b = key(right);
    const index = a.findIndex((value, position) => value !== b[position]);
    return index < 0 ? left.id.localeCompare(right.id) : a[index]! - b[index]!;
  });
};
