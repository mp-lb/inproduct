import type { FileTypeRegistry } from "./fileTypeContracts.js";
import { createFileTypeRegistry } from "./createFileTypeRegistry.js";

let registry: FileTypeRegistry | undefined;

/** The shared built-in registry, built on first use. */
export const defaultFileTypeRegistry = () =>
  (registry ??= createFileTypeRegistry());
