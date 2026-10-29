import type { FileTypeCategory } from "./fileTypeCategory.js";
/** Where a type definition came from. `mime-db` covers entries without a recorded source. */
export type FileTypeSource =
  | "iana"
  | "apache"
  | "nginx"
  | "mime-db"
  | "inproduct"
  | "custom";

/** A file format the library can name, label and match against bytes. `id` is the
 * stable format identifier, independent of transport headers. */
export type FileType = {
  id: string;
  /** Used only at HTTP/object-storage boundaries. */
  mediaType: string;
  label: string;
  category: FileTypeCategory;
  /** Compatible extensions, lowercase without a leading dot. The first is preferred. */
  extensions: string[];
  /** Other media types that mean this type, such as `image/jpg`. */
  aliases: string[];
  /** Text formats are matched as UTF-8 text without control characters. */
  textual: boolean;
  /** Formats a browser can execute or script when rendered: HTML, SVG, XML, JavaScript. */
  active: boolean;
  source: FileTypeSource;
};

/** Adds a type, or overrides the named fields of an existing one with the same `id`. */
export type FileTypeInput = {
  id: string;
  mediaType?: string;
  label?: string;
  category?: FileTypeCategory;
  extensions?: string[];
  aliases?: string[];
  textual?: boolean;
  active?: boolean;
};

export type FileTypeRegistryOptions = {
  /** Include the built-in registry (mime-db plus InProduct's overlay). Defaults to true. */
  builtins?: boolean;
  types?: FileTypeInput[];
  /** Resolves an ambiguous extension to one type id, such as `{ ts: "text/x-typescript" }`. */
  extensionPreferences?: Record<string, string>;
};

export type ExtensionLookup = {
  extension: string;
  /** Every type that lists the extension, preferred first. */
  types: FileType[];
  preferred: FileType | null;
  ambiguous: boolean;
};

export type FileTypeRegistry = {
  /** Resolves a media type, alias or header value with parameters. */
  get(mediaType: string): FileType | undefined;
  byExtension(extension: string): ExtensionLookup;
  list(): FileType[];
};

/** How strongly bytes support a type. `exact` and `compatible` are format
 * recognition, never proof that a file is well formed or safe. */
export type ContentMatch = "exact" | "compatible" | "mismatch" | "unrecognized";

/** What the library knows about a stored file's type.
 * - `recognized`: bytes positively identify the type.
 * - `compatible`: bytes fit the type's container or text family but do not pin it down.
 * - `inferred`: from the file name or client-reported type only.
 * - `unknown`: no type could be determined; stored as `application/octet-stream`. */
export type FileTypeStatus =
  | "recognized"
  | "compatible"
  | "inferred"
  | "unknown";

/** The byte check a type must pass. `unchecked` skips content matching only. */
export type ContentCheck = "exact" | "compatible" | "unchecked";

export type ContentDetection = {
  /** Type ids the bytes positively identify. */
  types: string[];
  /** Generic container or family the bytes belong to, such as `zip` or `text`. */
  container: string | null;
};

export type FileTypeConflict =
  | "extension-declared"
  | "content-extension"
  | "content-declared";

export type FileTypeIdentification = {
  status: FileTypeStatus | "conflict";
  /** Best candidate. Null for unknown evidence and unresolved name/declared conflicts. */
  type: FileType | null;
  /** Every type consistent with the claims considered, best first. */
  candidates: FileType[];
  evidence: {
    extension: { value: string; types: string[] } | null;
    declared: { value: string; type: string | null } | null;
    content: (ContentDetection & { match: ContentMatch | null }) | null;
  };
  conflicts: FileTypeConflict[];
};
