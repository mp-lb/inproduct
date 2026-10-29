import type { FileLink, FileLinkTarget } from "./fileLinks.js";
import type { BeginFile, FileView } from "./fileLibraryTypes.js";
import type {
  ContentCheck,
  FileTypeRegistry,
  FileTypeStatus,
} from "../file-types/fileTypeContracts.js";

/** Trusted identity resolved by the host from its own session, never request JSON. */
export type Actor = { id: string; tenantId: string };

export type Action =
  | "link"
  | "unlink"
  | "upload"
  | "read"
  | "write"
  | "download"
  | "attach"
  | "release"
  | "delete"
  | "diagnostics"
  | "configure";

export type MalwarePolicy = "required" | "allow-unscanned";

export type FileHold = {
  id: string;
  consumer: string;
  state: "reserved" | "attached" | "released";
};

/** Persisted file. `name` is the editable name and `extension` the library-managed
 * extension. Records written by 0.1.6 and earlier have neither `extension` nor `typeStatus`
 * and keep the full uploaded file name in `name`; views derive both on read. */
export type FileRecord = Omit<
  FileView,
  "holdCount" | "extension" | "fileName" | "type" | "links"
> & {
  extension?: string | null;
  typeStatus?: FileTypeStatus;
  malwarePolicy?: MalwarePolicy;
  tenantId: string;
  operationId: string;
  requestHash: string;
  key: string;
  checksum: string;
  version: string | null;
  uploadUntil: number;
  expiresAt: number;
  lease: string | null;
  leaseUntil: number;
  deletedAt: number | null;
  holds: FileHold[];
};

export type FileAudit = {
  id: string;
  eventType: string;
  fileId: string;
  actorId: string;
  at: number;
  timestamp: string;
  userId: string;
  details: {
    version: 1;
    fileRevision: number;
    scan?: FileView["scan"];
    malwarePolicy?: MalwarePolicy;
    state: FileRecord["state"];
    usage?: { id: string; consumer: string };
    link?: FileLinkTarget;
  };
};

export type FilePartition = {
  _id: string;
  revision: number;
  quotaBytes?: number;
  quotaUpdatedAt?: number;
  quotaUpdatedBy?: string;
  files: FileRecord[];
  /** Authoritative associations, persisted separately from file records. */
  links?: FileLink[];
  audit: FileAudit[];
};

/** Compare-and-swap must be atomic and durably acknowledged. `save` returns
 * false when `expectedRevision` is stale. No remote work happens in a mutation. */
export type FileRepository = {
  read(tenantId: string): Promise<FilePartition>;
  save(next: FilePartition, expectedRevision: number): Promise<boolean>;
};

export type ObjectInspection = {
  version: string;
  sizeBytes: number;
  contentType: string;
  checksum: string;
};

/** Object-store adapter. Capabilities are declarations the library refuses to run without. */
export type ObjectDriver = {
  capabilities: {
    versioned: boolean;
    checksum: boolean;
    conditionalCreate: boolean;
  };
  /** `metadata.contentType` is the library's resolved canonical type. */
  signUpload(input: {
    key: string;
    metadata: BeginFile & { contentType: string };
    expiresAt: number;
    signal?: AbortSignal;
  }): Promise<{ url: string; headers: Record<string, string> }>;
  inspect(
    key: string,
    version?: string,
    signal?: AbortSignal,
  ): Promise<ObjectInspection>;
  /** `name` is the sanitized download file name and `contentType` the type to
   * serve. Defaults to attachment; inline is requested only for verified preview types. */
  download(input: {
    disposition?: "attachment" | "inline";
    key: string;
    version: string;
    name: string;
    contentType?: string;
    expiresAt: number;
    signal?: AbortSignal;
  }): Promise<{ url: string }>;
};

export type ScanInput = {
  key: string;
  version: string;
  checksum: string;
  contentType: string;
  /** The byte check the type must pass. Absent means `exact`. */
  contentCheck?: ContentCheck;
  signal?: AbortSignal;
};

/** Must inspect the exact pinned version and detect content, not trust upload MIME. */
export type Scanner = {
  scan(input: ScanInput): Promise<"clean" | "rejected">;
};

/** `true` passes with the status implied by `contentCheck`; return an object to
 * report what the bytes actually showed. */
export type ByteValidator = {
  validate(
    input: ScanInput,
  ): Promise<boolean | { valid: boolean; typeStatus: FileTypeStatus }>;
};

/** Which file types uploads may have and the evidence each must show. */
export type FileTypePolicy = {
  /** Defaults to the built-in registry. */
  registry?: FileTypeRegistry;
  /** Accepted type ids or aliases. Omit to accept all types, including unknown. */
  accept?: readonly string[];
  /** Defaults to exact with an allowlist; otherwise uses the strongest available check. */
  contentCheck?: "exact" | "compatible";
  /** Per-type checks. `unchecked` accepts a type without content matching. */
  contentChecks?: Record<string, ContentCheck>;
  /** When the file name and the client-reported type disagree. Defaults to `reject`. */
  onConflict?: "reject" | "prefer-extension" | "prefer-declared";
};

/** Host authorization decision. Return false unless the exact request is allowed. */
export type AuthorizeFileAction = (input: {
  actor: Actor;
  action: Action;
  file?: FileView;
  scope?: string;

  consumer?: string;
  link?: FileLinkTarget;
}) => Promise<boolean>;

export type FileLibraryOptions = {
  /** Optional per-file limits by link type, checked atomically. No limit by default. */
  maxLinksPerType?: Record<string, number>;
  malwarePolicy?: MalwarePolicy;
  fileTypes?: FileTypePolicy;
  byteValidator?: ByteValidator;
  repository: FileRepository;
  driver: ObjectDriver;
  scanner?: Scanner;
  authorize: AuthorizeFileAction;
  now?: () => number;
  uuid?: () => string;
  /** Provider/scanner deadline. Defaults to 15 seconds, at most 30 seconds. */
  operationTimeoutMs?: number;
  quotaBytes: number;
  /** Lifetime file records per tenant partition. Defaults to and caps at 500. */
  maxFiles?: number;
};
