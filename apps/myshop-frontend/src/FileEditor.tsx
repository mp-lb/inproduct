import { useState } from "react";
import type { FileMetadata, StorageFile } from "@mp-lb/inproduct-storage";

type Props = {
  file: StorageFile;
  busy: boolean;
  save: (metadata: FileMetadata) => Promise<boolean>;
  close: () => void;
};

export const FileEditor = ({ file, busy, save, close }: Props) => {
  const [name, setName] = useState(file.name);
  const [tags, setTags] = useState(file.tags.join(", "));
  return (
    <form
      className="editor"
      aria-label="Edit file"
      onSubmit={async (event) => {
        event.preventDefault();
        if (await save({ name, tags: tags.split(",") })) close();
      }}
    >
      <h3>Edit file details</h3>
      <label>
        File name
        <input
          value={name}
          maxLength={255}
          required
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label>
        Tags (comma separated)
        <input value={tags} onChange={(event) => setTags(event.target.value)} />
      </label>
      <div className="actions">
        <button disabled={busy}>Save file</button>
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={close}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
