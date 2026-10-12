# @mp-lb/inproduct-storage

Small, independent object-storage primitives for applications that own their data.
Requires Node.js 22.13+ and ESM. No account, environment variables, database, or
InProduct application scaffold is required.

## Install and initialize

Once released, install with `pnpm add @mp-lb/inproduct-storage`. Before the first
release, workspace consumers can use `pnpm add @mp-lb/inproduct-storage@workspace:*`
and build with `pnpm --filter @mp-lb/inproduct-storage build`.

```ts
import { createStorage, createMemoryStorageAdapter } from "@mp-lb/inproduct-storage";

const storage = createStorage({
  adapter: createMemoryStorageAdapter(),
  prefix: "receipts", // optional namespace
  maxBytes: 5 * 1024 * 1024, // optional write limit
});

await storage.put("2026/order-123.txt", {
  body: new TextEncoder().encode("Order 123"),
  contentType: "text/plain",
});
const receipt = await storage.get("2026/order-123.txt");
if (receipt) console.log(new TextDecoder().decode(receipt.body));
await storage.delete("2026/order-123.txt");
```

## Behavior and configuration

`createStorage` requires an adapter. It snapshots `prefix` and `maxBytes` when
initialized. Prefixes and keys must be nonempty slash-separated names without empty,
`.` or `..` segments, backslashes, or control characters. Keys are case-sensitive
literal names: percent escapes are not decoded, and Unicode is not normalized.
Adapters must treat them as opaque names and must not decode them into paths.
Omit `prefix` for no namespace; an empty prefix is invalid.

Writes replace the complete object at a key. Reads return `undefined` for missing
objects. Deleting a missing object succeeds. `contentType` is optional, caller-supplied
metadata, not MIME detection or validation. `maxBytes` must be a nonnegative safe
integer; it checks each write's byte length, not total storage or reads. Omit it for
no limit. Invalid configuration throws synchronously; invalid operation arguments
reject with `TypeError` (keys) or `RangeError` (size). Adapter failures propagate.

Memory adapters copy bytes on writes and reads, including Node Buffer input. Each
adapter instance has its own data; facades can share an adapter to share storage.
Memory storage is unbounded and ephemeral. Use it for local development and tests,
not durable production files.

## Bring your own persistence

Implement the exported `StorageAdapter` contract with asynchronous `put`, `get`,
and `delete` operations, then pass it to `createStorage`. The emitted declarations
are the API reference. An adapter owns credentials, persistence, concurrency,
transport and operational errors. It must preserve bytes and content type, isolate
stored data from caller mutation, replace on put, and make deletion idempotent.
Only absence should become `undefined`; permission and network errors must reject.

This initial package includes no S3/filesystem adapter, listing, signed URLs,
streaming, retries or metadata database. Objects are buffered in memory. The host
application owns authentication, authorization and file validation. Prefixes are a
naming convenience, not tenant isolation: authorize access before calling storage.

This is a Tier 0 library: this README and shipped declarations are the reference.
See the [repository](https://github.com/mp-lb/inproduct) for contribution and release
instructions. The package is released independently through Changesets.
