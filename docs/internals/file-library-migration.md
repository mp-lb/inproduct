# File library migration from `@mp-lb/bondwf-file-storage`

This is the migration mapping for Nexus's private `packages/file-storage`
(`@mp-lb/bondwf-file-storage`) to the managed file library in
`@mp-lb/inproduct-storage`. The public consumer guide is
`docs/public/file-library.mdx`. This change does not modify Nexus.

## Entry points

| Nexus import | InProduct import |
| --- | --- |
| `@mp-lb/bondwf-file-storage` (schemas, `FileView`, `FileExplorerClient`, `formatFileValidationError`) | `@mp-lb/inproduct-storage/file-library` |
| `@mp-lb/bondwf-file-storage/server` (lifecycle, coordinator, audit, validator, scanner) | `@mp-lb/inproduct-storage/file-library/server` |
| `@mp-lb/bondwf-file-storage/server` (S3 adapters) | `@mp-lb/inproduct-storage/s3` |
| `@mp-lb/bondwf-file-storage/server` (Mongo adapters) | `@mp-lb/inproduct-storage/node` |
| `@mp-lb/bondwf-file-storage/testing` (`createMemoryFileRepository`, `createSyntheticObjects`) | `@mp-lb/inproduct-storage/file-library/testing` |

## Symbols

| Nexus | InProduct | Notes |
| --- | --- | --- |
| `createFileStorage` | `createFileLibrary` | Same options and methods. Renamed to avoid the existing small-file `createFileStorage`. |
| `FileStorage` (type) | `FileLibrary` | |
| `StorageOptions` | `FileLibraryOptions` | `authorize` is also exported as `AuthorizeFileAction`. |
| `Partition`, `Audit`, `FileRecord` | `FilePartition`, `FileAudit`, `FileRecord` | Same shapes. |
| `Actor`, `Action`, `FileRepository`, `ObjectDriver`, `ObjectInspection`, `Scanner`, `ByteValidator` | same names | Same shapes. |
| `createMongoFileRepository(db, name = "files")` | `createMongoFileLibraryRepository(db, name = "files")` | Same collections (`files`, `filesSettings`) and transactions. |
| `createMongoFileAuditLedger(db)` | `createMongoFileAuditLedger(db, name = "fileStorageAudit")` | Default collection is unchanged. |
| `createMongoFileReferenceStore(db)` | `createMongoFileReferenceStore(db, name = "fileStorageReferences")` | Default collection is unchanged. Rows are returned without `_id`. |
| `emptyPartition` (internal `repository.ts`) | `emptyFilePartition` | |
| `createFileAuditDispatcher`, `FileAuditLedger` | same | |
| `createFileReferenceCoordinator`, `FileReference`, `FileReferenceStore` | same | Also `createMemoryFileReferenceStore` in `/file-library/testing`. |
| `createFileByteValidator`, `createClamdScanner`, `scanPrivateFileBytes` | same | `verifyFileBytes` and the `ReadObjectVersion` type are now public. |
| `createS3FileDriver`, `createPrivateFileStore`, `PrivateFileStore` | same, from `/s3` | |
| `createVersionedDocumentStorage`, `VersionedDocumentStorage` | same, from `/s3` | `createS3DocumentStorage` / `MatterDocumentStorage` aliases stay in `matter-documents`. |
| `FileStorageError` | `FileStorageError` from `/file-library/server` (or the base entry point) | See error codes below. |
| `FileRuntimeStatus` | not moved | Host runtime status shape; keep in Nexus. |
| `createSyntheticFileDemo`, `createSyntheticDownloads` | not moved | Nexus demo/UI fixtures. |

## Behavior changes

- **Error codes.** One `FileStorageError` class now serves both storage APIs. Nexus
  `BAD_REQUEST` (invalid hold or reference identity) is now `INVALID_INPUT`. The
  Nexus tRPC procedure passes `error.code` to `TRPCError` directly, so it must map
  `INVALID_INPUT` to `BAD_REQUEST`. It should also map `TOO_LARGE` to
  `PAYLOAD_TOO_LARGE`. That code is not thrown by the library, but it is part of the
  shared union. `CONFLICT`, `PRECONDITION_FAILED`, `FORBIDDEN` and `NOT_FOUND` are
  unchanged.
- **Error messages.** The S3 driver's unversioned-bucket error is now `storage bucket
  requires versioning`; it was `storage bucket must have versioning enabled`. Versioned
  document storage uses the same message; it was `matter document bucket requires
  versioning`. Nexus's `createS3DocumentStorage` test matches `requires versioning`
  and still passes.
- **Private store endpoint.** `createPrivateFileStore` accepts plain HTTP only for
  `localhost`/`127.0.0.1`. Other non-HTTPS loopback protocols are now rejected.
- **AWS SDK mocks.** The S3 adapters import `@aws-sdk/client-s3` from the consumer's
  installed peer. Nexus tests that `vi.mock` or spy on `S3Client.prototype.send` still
  work if Nexus and InProduct resolve the same SDK copy. Keep one version in the
  lockfile.

## Unchanged guarantees

The lifecycle code is ported verbatim apart from decomposition. Begin/finalize
idempotency, quota CAS, the 60-second verification lease, version pinning, hold rules,
audit backpressure (2,000), the limits (500 files, 20 holds, 12 tags) and diagnostics
output all behave identically. Mongo documents keep the same shapes and default
collection names. No data migration is required.

## What stays in Nexus

The following stay in Nexus: trusted actor resolution (`assertIsAdmin`, the fixed
`bond-admin-files` tenant), the authorization policy, environment parsing,
runtime/maintenance scheduling (`createAdminFileIntegration`), the tRPC router, the
matter/email consumer facades (`createMatterFileConsumer`, `createMatterFileReferences`,
`createEmailAttachmentStorage`), the explorer UI and the synthetic demo.

## Configuration requirements

- MongoDB replica set (snapshot transactions). Standalone servers are not supported.
- S3 bucket with versioning enabled; S3 full-object SHA-256 checksums.
- Optional peers in the host: `mongodb@^7.2.0`, `@aws-sdk/client-s3@^3.1000.0`,
  `@aws-sdk/s3-request-presigner@^3.1000.0`.
- ClamAV over trusted private TCP when `malwarePolicy` is `required` (the default).

## Upgrading Nexus from 0.1.6 to file types and names

Nexus pins `@mp-lb/inproduct-storage@0.1.6`, which stores the full uploaded file name in
`name` and one of four content types in `contentType`. The next release separates the
editable name from a library-managed extension and type. See `docs/public/file-types.mdx`
and the "File types and names" section of `docs/public/file-library.mdx`. This change does
not modify or deploy Nexus.

### What changes for Nexus

| Area | 0.1.6 | Next release | Nexus action |
| --- | --- | --- | --- |
| `FileView.name` | Full file name, such as `report.pdf` | Editable name, such as `report` | Show `file.fileName` where the full name is expected (table cell `title`, download `anchor.download`, toasts). Keep `file.name` in the rename form. |
| New view fields | none | `extension`, `fileName`, `type { id, label, status }` | Show `file.type.label` in the Type column instead of `file.contentType`. |
| `beginFileSchema.contentType` | `z.enum(libraryContentTypes)`, required | Optional string, used only as evidence | `uploadFile` can keep sending `file.type`. An unsupported type now fails at `begin` with `FileStorageError("INVALID_INPUT")` instead of a client-side Zod error, so map it to `BAD_REQUEST` (the existing mapping). |
| Upload headers | `Content-Type` was the client's type | `Content-Type` is the resolved canonical type | No change, because `uploadFile` already sends `ticket.upload.headers`. |
| `editFileSchema.name` | Replaced the full file name | Sets the editable name. A trailing extension the file already has is stripped. | None. Old clients that send `report.pdf` still store `report`. |
| Downloads | Octet-stream, `filename*` only | Attachment with an ASCII fallback, sanitized name and the canonical type only for recognized passive content | None. |
| `ByteValidator.validate` | `Promise<boolean>` | `Promise<boolean \| { valid, typeStatus }>` | Only relevant to custom validators. Callers of `validate` must handle the object. |
| `ObjectDriver.download` input | `name` | `name` (sanitized download name) plus optional `contentType` | Only relevant to custom drivers. `createS3FileDriver` handles it. |
| `verifyFileBytes` | `(bytes, checksum, contentType)` | Optional `contentCheck` and `registry` parameters | None. |

### Persisted records

No data migration is required. Records written by 0.1.6 lack `extension` and `typeStatus`.
On read, the library splits the stored name against the stored type (for example,
`report.v2.pdf` becomes `report.v2` + `pdf`, and `notes` as plain text becomes
`notes` + `txt`). Names that do not match their type keep their full text, and the type's
extension is appended on download (`report.pdf` stored as text downloads as
`report.pdf.txt`). Unregistered types keep the whole name with no extension. Legacy files
report `inferred` status and download as octet-stream. The first rename writes the new shape.

To backfill instead, read each partition, set `name` and `extension` from
`fileRecordName(record, registry)`, and save through the repository's revision compare and
swap. Leave `typeStatus` unset unless you re-run byte validation. The Mongo documents keep the
same collection and shape otherwise.

### Steps

1. Bump `@mp-lb/inproduct-storage` in `packages/file-storage` once a release containing
   `/file-types` is published, and confirm with `npm view @mp-lb/inproduct-storage exports`.
2. In `FileExplorer.tsx`, use `file.fileName` for the name cell title and download name, and
   `file.type.label` for the Type column. Keep the rename form bound to `file.name`.
3. Optionally derive the file input's `accept` from
   `fileTypeAccept(fileTypePresets.library, defaultFileTypeRegistry())` instead of the
   hard-coded `.pdf,.txt,.png,.jpg,.jpeg`. This adds mime-db to the browser bundle.
4. Optionally add `byteValidator: createFileByteValidator(s3.readVersion)` so new files show
   `recognized` and download with their real type. This reads each object once more during
   finalize.
5. To accept more types, set `fileTypes` in the composition. Do not widen the accepted set
   without a byte check or an explicit `unchecked` decision.
6. Update Nexus tests that assert `name` equals the full file name.
