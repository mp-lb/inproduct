# @mp-lb/inproduct-storage

Independent object storage and headless file management for applications that own their data.
Requires Node.js 22.13+ and ESM. No account, environment variables, database, or
InProduct application scaffold is required.

## Install and initialize

Install with `pnpm add @mp-lb/inproduct-storage`. Workspace contributors can use
`pnpm add @mp-lb/inproduct-storage@workspace:*` and build with
`pnpm --filter @mp-lb/inproduct-storage build`.

```ts
import {
  createStorage,
  createMemoryStorageAdapter,
} from "@mp-lb/inproduct-storage";

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

## Managed file library

`/file-library`, `/file-library/server`, `/s3` and the Mongo adapters in `/node`
provide verified uploads to a versioned S3 bucket, quotas, immutable version pins,
retention holds, durable reference coordination and audit dispatch. Metadata stays
in your MongoDB replica set; identity, authorization and domain records stay in your
application. See the [managed file library guide](../../docs/public/file-library.mdx).

## File types and names

`/file-types` is a browser-safe file type registry backed by mime-db. It covers about 2,500
media types with labels, aliases and preferred and multi-part extensions. It identifies types
from the file name, the client-reported type and the bytes, keeps conflicts and uncertainty
explicit, and builds safe download names and headers. The file library uses it, so each file
has an editable `name` and one library-managed type and extension. See the
[file types guide](../../docs/public/file-types.mdx).

## Backend-backed file management

### Metadata for externally stored files

For applications that keep bytes in S3 or another object store, use
`createMongoFileMetadataRepository` from the Node entry point. Pass the MongoDB
database and the name of the single files collection. Each file is a separate
document containing its ID, tenant ID, object key, and your metadata. The
repository never stores file bytes. It keeps revision, quota, and audit control
state in a separate `<collectionName>Settings` collection and uses MongoDB
replica-set transactions for consistent updates.

```ts
import { createMongoFileMetadataRepository } from "@mp-lb/inproduct-storage/node";

const repository = createMongoFileMetadataRepository(db, "files");
// Supply this repository to your authorized file lifecycle and tRPC router.
```

The existing `createMongoFileStorageAdapter` is for the older small-file API
that stores bytes inside MongoDB. Use the metadata repository for central
S3-backed files.

### Small-file API

The Node entry point supplies a disk adapter and HTTP handler; the frontend only
needs the client, hook and your markup. No separate hosted service is required.

```ts
// Your existing Node backend
import { createServer } from "node:http";
import { createFileStorage } from "@mp-lb/inproduct-storage";
import {
  createDiskFileStorageAdapter,
  createFileStorageHandler,
} from "@mp-lb/inproduct-storage/node";

const storage = createFileStorage({
  adapter: createDiskFileStorageAdapter({ directory: "./data/files" }),
});
const server = createServer(
  createFileStorageHandler({
    storage,
    authorize: (request) => yourExistingAdminCheck(request),
  }),
);
// Listen using your application's configured port.
```

```tsx
// Frontend: keep the client stable, outside the component.
import { createFileStorageClient } from "@mp-lb/inproduct-storage";
import { useFileStorage } from "@mp-lb/inproduct-storage/react";

const client = createFileStorageClient("/api/files");

export const Files = () => {
  const files = useFileStorage(client);
  return (
    <section>
      <input
        type="file"
        disabled={files.busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void files.uploadFile(file);
          event.target.value = "";
        }}
      />
      {files.error && <p role="alert">{files.error}</p>}
      {files.loading ? (
        <p>Loading…</p>
      ) : (
        files.files.map((file) => (
          <button
            key={file.id}
            disabled={files.busy}
            onClick={() => void files.download(file.id)}
          >
            {file.name}
          </button>
        ))
      )}
    </section>
  );
};
```

`yourExistingAdminCheck` represents your application's authorization, not a package
export. Authorization is required for every API operation. Bind storage to the
appropriate tenant; this generic handler does not infer tenant scope or ownership.
Mount the handler directly or forward `/api/files` from your existing Node router.
The client uses same-origin credentials; supply a custom fetch implementation for
other authentication. Keep the Node entry point and credentials out of the frontend.
MyShop demonstrates this complete flow with a loopback-only backend and Vite proxy.

### Using an existing tRPC API

`@mp-lb/inproduct-storage/trpc` exports `createFileStorageTRPCClient`. Pass it
the authorized file router from your application's tRPC client, then pass the
result to `useFileStorage`. The adapter maps the router's `list`, `upload`,
`edit`, `remove` and `download` procedures to the transport-independent client.
Uploads and downloads carry base64 bytes in tRPC JSON, so the host must set a
matching request size limit. Keep authorization and file size enforcement on the
server. This is a client transport adapter, not a router or an auth policy.

```ts
import { createFileStorageTRPCClient } from "@mp-lb/inproduct-storage/trpc";

const client = createFileStorageTRPCClient(trpcClient.storedFiles);
```

### MongoDB persistence

If your application already has a MongoDB `Db`, choose a collection name for either
storage API. The adapters use that collection for both bytes and metadata; the
application retains control of its database connection, access rules and relations.
Install `mongodb@^7.2.0` in the host application; the adapter uses the host's driver.

```ts
import { createFileStorage, createStorage } from "@mp-lb/inproduct-storage";
import {
  createMongoFileStorageAdapter,
  createMongoStorageAdapter,
} from "@mp-lb/inproduct-storage/node";

const files = createFileStorage({
  adapter: createMongoFileStorageAdapter(db, "productFiles"),
});
const objects = createStorage({
  adapter: createMongoStorageAdapter(db, "productObjects"),
});
```

Each adapter uses one document per object or file, with MongoDB's `_id` as the key
or file ID. Use separate collections for the two document formats. Writes and file
metadata edits are atomic per document. File listing reads metadata, while downloads
read bytes. The adapters buffer whole objects, so MongoDB's document size limit
applies. They do not create application relations, infer a tenant, scan bytes,
version objects, or implement soft deletion. Bind a suitably scoped `Db` and
collection behind your application's authorization boundary.

Install React 18 or 19 for the optional `/react` entry point. The base entry point
does not import React or Node built-ins. The hook owns loading, errors, refresh after
mutations, search/tag filters, pagination and browser upload/download.
You render the table, forms and deletion confirmation. Operations return a success
boolean; failures are exposed in `error`. A failed refresh after a successful write
is reported in `error`, while the write still counts as successful.

The handler validates inputs and limits request bodies to 11 MiB by default,
including multipart overhead. The storage service separately limits file contents
to 10 MiB by default. Configure both `maxRequestBytes` and `maxBytes` together when
raising limits. Expected errors produce 400/403/404/413 responses; unexpected adapter
errors return a generic 500, with the original error passed to `onError` for logging.
Downloads use attachment headers and a binary content type. The handler adds no CORS
policy; serve it on the same origin or use your app's existing proxy/security layer.

## File persistence and behavior

`createDiskFileStorageAdapter` persists each file's bytes and metadata together using
atomic replacement. Use one adapter instance per directory in a single-process
backend. Writes are serialized within that instance; multiple processes/instances
sharing a directory are unsupported. Existing records survive process restarts.
The adapter buffers records and scans them when listing, so use a database/object
store adapter for large collections. It is not an S3 adapter or a distributed store.
Atomic replacement avoids partially visible writes; it does not promise power-loss
durability or provide backups. Keep the directory outside your public/static roots.

`createFileStorage()` without an adapter remains an isolated **ephemeral memory**
client for tests and prototypes. Its files disappear when the instance is discarded.
MyShop deliberately uses the disk adapter on its backend instead.

Uploads get unique IDs even for duplicate names. Edits change name and
tags without changing bytes. Deletion immediately removes a file and is idempotent.
Names cannot contain path separators or control characters; tags are trimmed and
deduplicated. Content types are caller-supplied, not verified. There is no total
quota, malware scanning, audit ledger, retention or sharing policy.

Listing searches names/tags case-insensitively, combines exact tag filters,
and returns newest uploads first. Usage totals include all files regardless of
filters. Pages default to 25 entries (maximum 100). Offset pages reflect current
data, so concurrent changes can shift entries between pages.

To add another persistence provider, implement `FileStorageAdapter`. It owns atomic
bytes/metadata persistence, filtered listing and usage totals; updates must not
recreate deleted records. The memory and disk adapters are executable references.
`FileStorageClient` can also be implemented over an existing authorized transport
instead of using the supplied Node handler and HTTP client.

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

The low-level object API includes no listing. The package includes no S3 adapter, signed URLs,
streaming, retries or metadata database. Objects are buffered in memory. The host
application owns authentication, authorization and file validation. Prefixes are a
naming convenience, not tenant isolation: authorize access before calling storage.

This is a Tier 0 library: this README and shipped declarations are the reference.
See the [repository](https://github.com/mp-lb/inproduct) for contribution and release
instructions. Changed package builds are published automatically on pushes to `main`.
