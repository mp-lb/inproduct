import { classifyFileType } from "./classifyFileType.js";
import mimeDb from "mime-db";
import type { FileType, FileTypeSource } from "./fileTypeContracts.js";
import { builtinFileTypeOverlay } from "./builtinFileTypeOverlay.js";
import { fallbackFileTypeLabel } from "./fallbackFileTypeLabel.js";
import { isActiveMediaType } from "./isActiveMediaType.js";
import { isTextualMediaType } from "./isTextualMediaType.js";

/** mime-db's media types with InProduct's overlay applied: aliases folded into
 * their canonical id, curated labels, extra formats and compound extensions. */
export const builtinFileTypes = (): FileType[] => {
  const overlay = builtinFileTypeOverlay;
  const types = new Map<string, FileType>();

  const define = (
    id: string,
    extensions: readonly string[],
    source: FileTypeSource,
    charset?: string,
  ) =>
    types.set(id, {
      id,
      label: "",
      category: classifyFileType(id),
      extensions: [...extensions],
      aliases: [],
      textual: isTextualMediaType(id, charset),
      active: isActiveMediaType(id),
      source,
    });

  for (const [id, entry] of Object.entries(mimeDb))
    define(
      id,
      entry.extensions ?? [],
      entry.source ?? "mime-db",
      entry.charset,
    );

  for (const input of overlay.types) {
    const existing = types.get(input.id);
    if (!existing) define(input.id, input.extensions, "inproduct");
    const type = types.get(input.id)!;
    type.extensions = [...new Set([...input.extensions, ...type.extensions])];
    type.textual ||= !!input.textual;
  }

  for (const [id, aliases] of Object.entries(overlay.aliases)) {
    const type = types.get(id);
    if (!type) throw new Error(`file type overlay names unknown type ${id}`);

    for (const alias of aliases) {
      const folded = types.get(alias);

      if (folded) {
        type.extensions = [
          ...new Set([...type.extensions, ...folded.extensions]),
        ];

        types.delete(alias);
      }

      type.aliases.push(alias);
    }
  }

  for (const [id, extensions] of Object.entries(overlay.extensions)) {
    const type = types.get(id);
    if (type)
      type.extensions = [...new Set([...type.extensions, ...extensions])];
  }

  for (const type of types.values())
    type.label =
      overlay.labels[type.id] ??
      fallbackFileTypeLabel(type.id, type.extensions);

  return [...types.values()];
};
