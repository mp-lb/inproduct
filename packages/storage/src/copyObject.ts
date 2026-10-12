import type { StoredObject } from "./types.js";

export const copyObject = (object: StoredObject): StoredObject => ({
  ...object,
  body: new Uint8Array(object.body),
});
