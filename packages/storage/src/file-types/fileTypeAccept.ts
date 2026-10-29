import type { FileTypeRegistry } from "./fileTypeContracts.js";

/** An `<input accept>` value listing each type's media type and extensions. */
export const fileTypeAccept = (
  ids: readonly string[],
  registry: FileTypeRegistry,
) =>
  [
    ...new Set(
      ids.flatMap((id) => {
        const type = registry.get(id);
        if (!type) throw new Error(`unknown file type ${id}`);
        return [
          type.id,
          ...type.extensions.map((extension) => `.${extension}`),
        ];
      }),
    ),
  ].join(",");
