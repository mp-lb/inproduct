import type { FileTypePolicy } from "./fileLibraryContracts.js";
import type {
  ContentCheck,
  FileType,
} from "../file-types/fileTypeContracts.js";
import { canCheckContent } from "../file-types/canCheckContent.js";
import { defaultFileTypeRegistry } from "../file-types/defaultFileTypeRegistry.js";

/** Validates the type policy once, at construction. Every accepted type must be
 * registered and enforceable by the built-in detector under its byte check. */
export const resolveFileTypePolicy = (policy: FileTypePolicy = {}) => {
  const registry = policy.registry ?? defaultFileTypeRegistry();
  const fallback = policy.contentCheck ?? (policy.accept ? "exact" : undefined);
  const accepted = new Map<string, FileType>();

  const checks = new Map(
    Object.entries(policy.contentChecks ?? {}).map(([id, check]) => {
      const type = registry.get(id);
      if (!type) throw new Error(`unknown file type ${id}`);
      return [type.id, check];
    }),
  );

  const contentCheck = (type: FileType): ContentCheck =>
    checks.get(type.id) ??
    fallback ??
    (canCheckContent(type, "exact")
      ? "exact"
      : canCheckContent(type, "compatible")
        ? "compatible"
        : "unchecked");

  for (const id of policy.accept ?? []) {
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
    unrestricted: policy.accept === undefined,
    contentCheck,
    onConflict: policy.onConflict ?? "reject",
  };
};

export type ResolvedFileTypePolicy = ReturnType<typeof resolveFileTypePolicy>;
