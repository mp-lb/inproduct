# @mp-lb/inproduct-storage

## Unreleased

- Add `/file-types`: a browser-safe registry of about 2,500 mime-db media types with
  curated labels, aliases, ambiguous-extension preferences and multi-part extensions.
  It also adds custom types and overrides, evidence-based identification
  (`recognized`/`compatible`/`inferred`/`unknown`/`conflict`), safe file names and one
  download response policy.
- **Behavior change:** `FileView.name` is now the editable name without its extension.
  New fields are `extension`, `fileName` and `type { id, label, status }`. Records from 0.1.6
  are split on read with no backfill. Renames keep the extension and strip a trailing
  extension the file already has.
- `beginFileSchema.contentType` is now an optional client claim. The library resolves the
  canonical type from the file name and reported type, and rejects unaccepted types and
  name/type conflicts with `INVALID_INPUT`. The default accepted types and exact byte checks
  are unchanged. Configure others with `fileTypes`.
- Byte validation uses the registry's content detection. `ByteValidator` may return
  `{ valid, typeStatus }`. Validators and the ClamAV scanner accept a `registry`. RTF and
  PostScript bytes no longer pass as plain text.
- Downloads send an ASCII `filename` fallback and sanitized names. The library serves the
  canonical type only for recognized, non-active content, and octet-stream otherwise.

- Resolve MongoDB through the host application's driver so `Db` types match across package boundaries.
- Add MongoDB adapters for object storage and file management. Consumers supply their existing `Db` and choose collection names.

## 0.1.0

### Minor Changes

- a1fb9ab: Introduce independent object storage with a configurable facade and an in-memory adapter.
- cebc422: Add pluggable file management with a memory client, durable local disk adapter, Node HTTP handler and browser client, metadata validation, search, pagination and usage totals. Add an optional React entry point with a headless file-storage hook for uploads, edits, downloads and deletion.
