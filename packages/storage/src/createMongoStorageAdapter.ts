import { Binary, type Db } from "mongodb";
import type { StorageAdapter } from "./types.js";

type ObjectDocument = {
  _id: string;
  body: Binary;
  contentType?: string;
};

/** Persists opaque objects in a MongoDB collection owned by the host application. */
export const createMongoStorageAdapter = (
  db: Db,
  collectionName: string,
): StorageAdapter => {
  if (!collectionName.trim())
    throw new TypeError("collection name is required");
  const collection = db.collection<ObjectDocument>(collectionName);

  return {
    put: async (key, object) => {
      await collection.replaceOne(
        { _id: key },
        {
          body: new Binary(Buffer.from(object.body)),
          ...(object.contentType === undefined
            ? {}
            : { contentType: object.contentType }),
        },
        { upsert: true },
      );
    },
    get: async (key) => {
      const document = await collection.findOne({ _id: key });
      return document
        ? {
            body: new Uint8Array(document.body.value()),
            ...(document.contentType === undefined
              ? {}
              : { contentType: document.contentType }),
          }
        : undefined;
    },
    delete: async (key) => {
      await collection.deleteOne({ _id: key });
    },
  };
};
