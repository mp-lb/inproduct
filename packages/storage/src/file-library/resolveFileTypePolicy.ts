import type { FileTypePolicy } from "./fileLibraryContracts.js";
import type {
  ContentCheck,
  FileType,
} from "../file-types/fileTypeContracts.js";
import { canCheckContent } from "../file-types/canCheckContent.js";
import { defaultFileTypeRegistry } from "../file-types/defaultFileTypeRegistry.js";
import { libraryContentTypes } from "./fileLibrarySchemas.js";

/** Validates the type policy once, at construction. Every accepted type must be
 * registered and enforceable by the built-in detector under its byte check. */
export const resolveFileTypePolicy = (policy: FileTypePolicy = {}) => {
  const registry = policy.registry ?? defaultFileTypeRegistry();
  const fallback = policy.contentCheck ?? "exact";
  const accepted = new Map<string, FileType>();

  const checks = new Map(
    Object.entries(policy.contentChecks ?? {}).map(([id, check]) => {
      const type = registry.get(id);
      if (!type) throw new Error(`unknown file type ${id}`);
      return [type.id, check];
    }),
  );

  const contentCheck = (type: FileType): ContentCheck =>
    checks.get(type.id) ?? fallback;

  for (const id of policy.accept ?? libraryContentTypes) {
    const type = registry.get(id);
    if (!type) throw new Error(`unknown file type ${id}`);
    if (!canCheckContent(type, contentCheck(type)))
      throw new Error(
        `file type ${type.id} cannot pass the "${contentCheck(type)}" content check; set contentChecks to "compatible" or "unchecked"`,
      );
    accepted.set(type.id, type);
  }

  return {
    registry,
    accepted,
    contentCheck,
    onConflict: policy.onConflict ?? "reject",
  };
};

export type ResolvedFileTypePolicy = ReturnType<typeof resolveFileTypePolicy>;
