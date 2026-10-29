import type { FileTypeRegistry } from "./fileTypeContracts.js";
import { splitFileNameSuffixes } from "./splitFileNameSuffixes.js";

const opaqueExtension = /^(?=[a-z0-9]*[a-z])[a-z0-9]{1,16}$/;

/** The longest registered extension of a file name, else a plausible unregistered
 * last segment (letters and digits with at least one letter), else null. */
export const findFileExtension = (
  fileName: string,
  registry: FileTypeRegistry,
) => {
  const splits = splitFileNameSuffixes(fileName);

  const registered = splits.find(
    (split) => registry.byExtension(split.extension).types.length,
  );

  if (registered) return { ...registered, registered: true };
  const last = splits.at(-1);
  return last && opaqueExtension.test(last.extension)
    ? { ...last, registered: false }
    : null;
};
