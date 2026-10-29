import type {
  ExtensionLookup,
  FileType,
  FileTypeInput,
  FileTypeRegistry,
  FileTypeRegistryOptions,
} from "./fileTypeContracts.js";
import { builtinFileTypes } from "./builtinFileTypes.js";
import { builtinFileTypeOverlay } from "./builtinFileTypeOverlay.js";
import { fallbackFileTypeLabel } from "./fallbackFileTypeLabel.js";
import { fileExtensionPattern } from "./fileExtensionPattern.js";
import { isActiveMediaType } from "./isActiveMediaType.js";
import { isTextualMediaType } from "./isTextualMediaType.js";
import { normalizeMediaType } from "./normalizeMediaType.js";
import { rankExtensionTypes } from "./rankExtensionTypes.js";

const requireMediaType = (value: string) => {
  const id = normalizeMediaType(value);
  if (!id || value.includes(";"))
    throw new Error(`invalid file type id ${JSON.stringify(value)}`);
  return id;
};

const customType = (input: FileTypeInput, existing?: FileType): FileType => {
  const id = requireMediaType(input.id);

  const extensions = (input.extensions ?? existing?.extensions ?? []).map(
    (extension) => {
      const normalized = extension.trim().replace(/^\./, "").toLowerCase();
      if (!fileExtensionPattern.test(normalized))
        throw new Error(`invalid extension ${JSON.stringify(extension)}`);
      return normalized;
    },
  );

  const label = input.label?.trim() ?? existing?.label;
  if (label !== undefined && (!label || label.length > 80))
    throw new Error(`invalid label for file type ${id}`);

  return {
    id,
    label: label ?? fallbackFileTypeLabel(id, extensions),
    extensions: [...new Set(extensions)],
    aliases: [
      ...new Set([
        ...(existing?.aliases ?? []),
        ...(input.aliases ?? []).map(requireMediaType),
      ]),
    ],
    textual: input.textual ?? existing?.textual ?? isTextualMediaType(id),
    active: input.active ?? existing?.active ?? isActiveMediaType(id),
    source: "custom",
  };
};

/**
 * A file type registry. By default it holds every mime-db media type with
 * InProduct's curated labels, aliases and extension preferences. `types` adds
 * formats or overrides fields of existing ones; `extensionPreferences` settles
 * ambiguous extensions. Throws on invalid or contradictory definitions.
 */
export const createFileTypeRegistry = (
  options: FileTypeRegistryOptions = {},
): FileTypeRegistry => {
  const builtins = options.builtins ?? true;
  const types = new Map<string, FileType>();
  if (builtins) for (const type of builtinFileTypes()) types.set(type.id, type);

  for (const input of options.types ?? []) {
    const id = requireMediaType(input.id);
    types.set(id, customType(input, types.get(id)));
  }

  const aliases = new Map<string, string>();

  for (const type of types.values())
    for (const alias of type.aliases) {
      if (types.has(alias) || (aliases.get(alias) ?? type.id) !== type.id)
        throw new Error(`file type alias ${alias} is already defined`);
      aliases.set(alias, type.id);
    }

  const preferences: Record<string, string> = {
    ...(builtins ? builtinFileTypeOverlay.extensionPreferences : {}),
    ...options.extensionPreferences,
  };

  const byExtension = new Map<string, FileType[]>();

  for (const type of types.values()) {
    Object.freeze(type.extensions);
    Object.freeze(type.aliases);
    Object.freeze(type);

    for (const extension of type.extensions)
      byExtension.set(extension, [
        ...(byExtension.get(extension) ?? []),
        type,
      ]);
  }

  for (const [extension, id] of Object.entries(preferences)) {
    const listed = byExtension.get(extension) ?? [];
    if (!listed.some((type) => type.id === id))
      throw new Error(`preferred type ${id} does not list .${extension}`);
  }

  for (const [extension, listed] of byExtension)
    byExtension.set(
      extension,
      rankExtensionTypes(extension, listed, preferences[extension]),
    );

  return {
    get: (mediaType) => {
      const id = normalizeMediaType(mediaType);
      return id ? types.get(aliases.get(id) ?? id) : undefined;
    },
    byExtension: (value): ExtensionLookup => {
      const extension = value.trim().replace(/^\./, "").toLowerCase();
      const listed = byExtension.get(extension) ?? [];
      return {
        extension,
        types: [...listed],
        preferred: listed[0] ?? null,
        ambiguous: listed.length > 1,
      };
    },
    list: () => [...types.values()],
  };
};
