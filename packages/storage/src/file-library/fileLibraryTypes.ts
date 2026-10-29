import type { z } from "zod";
import type { FileTypeStatus } from "../file-types/fileTypeContracts.js";
import type {
  beginFileSchema,
  editFileSchema,
  fileCategorySchema,
  fileStateSchema,
  listFilesSchema,
} from "./fileLibrarySchemas.js";

export type BeginFile = z.infer<typeof beginFileSchema>;
export type FileCategory = z.infer<typeof fileCategorySchema>;
export type FileState = z.infer<typeof fileStateSchema>;
export type ScanState =
  | "pending"
  | "clean"
  | "rejected"
  | "unavailable"
  | "not_scanned";

/** The library's type information for a file. `status` says how the type was
 * established; it is never a validity or safety verdict. */
export type FileTypeView = {
  id: string;
  label: string;
  status: FileTypeStatus;
};

/** The caller-safe projection. It never contains object keys or versions. */
export type FileView = {
  id: string;
  /** The editable name, without the extension. */
  name: string;
  /** Library-managed extension compatible with `contentType`; renames never change it. */
  extension: string | null;
  /** Safe download file name: `name` plus `extension`. */
  fileName: string;
  scope: string;
  category: FileCategory;
  tags: string[];
  ownerId: string;
  sizeBytes: number;
  /** Canonical media type, equal to `type.id`. */
  contentType: string;
  type: FileTypeView;
  state: FileState;
  revision: number;
  createdAt: number;
  updatedAt: number;
  holdCount: number;
  scan: ScanState;
};

export type FileList = { items: FileView[]; nextCursor: string | null };

export type FileDiagnostics = {
  asOf: number;
  count: number;
  reservedBytes: number;
  verifiedBytes: number;
  quotaBytes: number;
  maxFiles: number;
  physicalBytes: null;
  lastPrune: null;
  mode: "report-only";
  candidates: { fileId: string; reason: string }[];
  blocked: { fileId: string; reason: string }[];
};

export type UploadTicket = {
  file: FileView;
  upload: {
    url: string;
    headers: Record<string, string>;
    expiresAt: number;
  } | null;
};

/** Transport-independent client for an authorized file library API. */
export type FileExplorerClient = {
  list(input: z.input<typeof listFilesSchema>): Promise<FileList>;
  begin(input: BeginFile): Promise<UploadTicket>;
  finalize(input: { fileId: string }): Promise<FileView>;
  edit(input: z.input<typeof editFileSchema>): Promise<FileView>;
  remove(input: { fileId: string }): Promise<FileView>;
  download(input: {
    fileId: string;
  }): Promise<{ url: string; expiresAt: number }>;
  diagnostics(): Promise<FileDiagnostics>;
};
