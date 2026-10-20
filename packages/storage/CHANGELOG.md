# @mp-lb/inproduct-storage

## Unreleased

- Resolve MongoDB through the host application's driver so `Db` types match across package boundaries.
- Add MongoDB adapters for object storage and file management. Consumers supply their existing `Db` and choose collection names.

## 0.1.0

### Minor Changes

- a1fb9ab: Introduce independent object storage with a configurable facade and an in-memory adapter.
- cebc422: Add pluggable file management with a memory client, durable local disk adapter, Node HTTP handler and browser client, metadata validation, search, pagination and usage totals. Add an optional React entry point with a headless file-storage hook for uploads, edits, downloads and deletion.
