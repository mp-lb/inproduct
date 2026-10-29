import type { FilePage, FileQuery, StorageFile } from "./fileTypes.js";

export const listFiles = (
  files: StorageFile[],
  { search, tag, offset, limit }: Required<FileQuery>,
): FilePage => {
  const needle = search.toLowerCase();

  const matches = files.filter(
    (file) =>
      (!tag || file.tags.includes(tag)) &&
      (!needle ||
        [file.name, ...file.tags].some((value) =>
          value.toLowerCase().includes(needle),
        )),
  );

  return {
    items: structuredClone(matches.slice(offset, offset + limit)),
    total: matches.length,
    nextOffset: offset + limit < matches.length ? offset + limit : null,
    usage: {
      count: files.length,
      bytes: files.reduce((sum, file) => sum + file.sizeBytes, 0),
    },
  };
};
