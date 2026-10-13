import { useState } from "react";
import type { FileStorageClient, StorageFile } from "@mp-lb/inproduct-storage";
import { useFileStorage } from "@mp-lb/inproduct-storage/react";
import { FileEditor } from "./FileEditor";

export const FileStorageSection = ({
  client,
}: {
  client: FileStorageClient;
}) => {
  const storage = useFileStorage(client);
  const [editing, setEditing] = useState<StorageFile>();
  const [deleting, setDeleting] = useState<StorageFile>();
  return (
    <section className="file-storage" aria-label="File storage administration">
      <div className="section-heading">
        <div>
          <h2>File storage</h2>
          <p className="muted">
            Files are saved on your local backend and survive reloads and
            restarts. Files are not malware-scanned.
          </p>
        </div>
        <button
          className="secondary"
          disabled={storage.busy || storage.loading}
          onClick={() => void storage.refresh()}
        >
          Refresh
        </button>
      </div>
      <div className="storage-stats">
        <div>
          <span>Files</span>
          <strong>{storage.usage?.count ?? "—"}</strong>
        </div>
        <div>
          <span>Stored bytes</span>
          <strong>{storage.usage?.bytes.toLocaleString() ?? "—"}</strong>
        </div>
        <div>
          <span>Per-file limit</span>
          <strong>10 MiB</strong>
        </div>
        <div>
          <span>Storage</span>
          <strong>Local disk</strong>
        </div>
      </div>
      <div className="storage-toolbar">
        <label>
          Search files
          <input
            type="search"
            placeholder="Search names and tags"
            value={storage.query.search ?? ""}
            onChange={(event) =>
              storage.setFilters({ search: event.target.value })
            }
          />
        </label>
        <label>
          Filter category
          <input
            placeholder="All categories"
            value={storage.query.category ?? ""}
            onChange={(event) =>
              storage.setFilters({ category: event.target.value })
            }
          />
        </label>
        <label>
          Filter tag
          <input
            placeholder="All tags"
            value={storage.query.tag ?? ""}
            onChange={(event) =>
              storage.setFilters({ tag: event.target.value })
            }
          />
        </label>
      </div>
      <div className="storage-toolbar">
        <label>
          Upload file
          <input
            type="file"
            disabled={storage.busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void storage.uploadFile(file, { category: "admin" });
              event.target.value = "";
            }}
          />
        </label>
        <button
          className="secondary"
          disabled={storage.busy}
          onClick={() =>
            void storage.upload({
              name: "shop-notes.txt",
              body: new TextEncoder().encode(
                "MyShop synthetic file example.\n",
              ),
              contentType: "text/plain",
              category: "admin",
              tags: ["demo"],
            })
          }
        >
          Add example file
        </button>
      </div>
      {storage.error && <p role="alert">{storage.error}</p>}
      {storage.busy && <p role="status">Working…</p>}
      {editing && (
        <FileEditor
          key={editing.id}
          file={editing}
          busy={storage.busy}
          save={(metadata) => storage.edit(editing.id, metadata)}
          close={() => setEditing(undefined)}
        />
      )}
      {deleting && (
        <div
          className="delete-confirmation"
          role="group"
          aria-label="Confirm file deletion"
        >
          <p>
            Delete <strong>{deleting.name}</strong>? Its contents will be
            removed from this demo.
          </p>
          <div className="actions">
            <button
              disabled={storage.busy}
              onClick={async () => {
                if (await storage.remove(deleting.id)) {
                  if (editing?.id === deleting.id) setEditing(undefined);
                  setDeleting(undefined);
                }
              }}
            >
              Confirm delete
            </button>
            <button
              className="secondary"
              disabled={storage.busy}
              onClick={() => setDeleting(undefined)}
            >
              Keep file
            </button>
          </div>
        </div>
      )}
      {storage.loading ? (
        <p role="status">Loading files…</p>
      ) : (
        <div className="file-table">
          <table>
            <caption className="muted">{storage.total} matching files</caption>
            <thead>
              <tr>
                {[
                  "Name",
                  "Category / tags",
                  "Status",
                  "Size",
                  "Updated",
                  "Actions",
                ].map((heading) => (
                  <th scope="col" key={heading}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {storage.files.map((file) => (
                <tr key={file.id}>
                  <td>
                    <button
                      className="text file-name"
                      disabled={storage.busy}
                      onClick={() => setEditing(file)}
                    >
                      {file.name}
                    </button>
                    <small>{file.contentType}</small>
                  </td>
                  <td>
                    {file.category}
                    <small>{file.tags.join(", ") || "No tags"}</small>
                  </td>
                  <td>
                    <span className="file-status">Available</span>
                    <small>Unscanned</small>
                  </td>
                  <td>{file.sizeBytes.toLocaleString()} B</td>
                  <td>{new Date(file.updatedAt).toLocaleString()}</td>
                  <td>
                    <div className="actions">
                      <button
                        className="secondary"
                        disabled={storage.busy}
                        onClick={() => void storage.download(file.id)}
                      >
                        Download
                      </button>
                      <button
                        className="text"
                        disabled={storage.busy}
                        onClick={() => setDeleting(file)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!storage.files.length && (
            <p className="empty-files">
              {storage.query.search ||
              storage.query.category ||
              storage.query.tag
                ? "No files match these filters."
                : "No files yet. Upload a file or add an example to get started."}
            </p>
          )}
        </div>
      )}
      <div className="storage-pagination">
        <button
          className="secondary"
          disabled={!storage.query.offset || storage.loading || storage.busy}
          onClick={storage.firstPage}
        >
          First page
        </button>
        <button
          className="secondary"
          disabled={!storage.hasNextPage || storage.loading || storage.busy}
          onClick={storage.nextPage}
        >
          Next page
        </button>
      </div>
    </section>
  );
};
