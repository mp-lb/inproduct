import { Binary, type Db, type Filter } from "mongodb";
import { FileStorageError } from "./FileStorageError.js";
import type {
  FileQuery,
  FileStorageAdapter,
  StorageFile,
} from "./fileTypes.js";
import type { StoredObject } from "./types.js";

type FileDocument = {
  _id: string;
  file: StorageFile;
  body: Binary;
};

const filterFiles = ({ search, tag }: Required<FileQuery>) => {
  const filter: Filter<FileDocument> = {};

  if (tag) filter["file.tags"] = tag;

  if (search) {
    const literal = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { "file.name": { $regex: literal, $options: "i" } },
      { "file.tags": { $regex: literal, $options: "i" } },
    ];
  }

  return filter;
};

/** Stores file bytes and metadata in one MongoDB document per file. */
export const createMongoFileStorageAdapter = (
  db: Db,
  collectionName: string,
): FileStorageAdapter => {
  if (!collectionName.trim())
    throw new TypeError("collection name is required");
  const collection = db.collection<FileDocument>(collectionName);

  return {
    insert: async (file, object: StoredObject) => {
      await collection.insertOne({
        _id: file.id,
        file: structuredClone(file),
        body: new Binary(Buffer.from(object.body)),
      });
    },
    get: async (id) => {
      const record = await collection.findOne({ _id: id });
      return record
        ? {
            file: record.file,
            object: {
              body: new Uint8Array(record.body.value()),
              contentType: record.file.contentType,
            },
          }
        : undefined;
    },
    update: async (id, metadata, updatedAt) => {
      const record = await collection.findOneAndUpdate(
        { _id: id },
        {
          $set: {
            "file.name": metadata.name,

            "file.tags": [...metadata.tags],
            "file.updatedAt": updatedAt,
          },
        },
        { returnDocument: "after" },
      );

      if (!record) throw new FileStorageError("NOT_FOUND", "file not found");
      return record.file;
    },
    remove: async (id) => {
      await collection.deleteOne({ _id: id });
    },
    list: async (query) => {
      const filter = filterFiles(query);

      const [items, total, usage] = await Promise.all([
        collection
          .find(filter, { projection: { file: 1 } })
          .sort({ "file.createdAt": -1, _id: -1 })
          .skip(query.offset)
          .limit(query.limit)
          .toArray(),
        collection.countDocuments(filter),
        collection
          .aggregate<{ count: number; bytes: number }>([
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                bytes: { $sum: "$file.sizeBytes" },
              },
            },
          ])
          .next(),
      ]);

      return {
        items: items.map((record) => record.file),
        total,
        nextOffset:
          query.offset + query.limit < total
            ? query.offset + query.limit
            : null,
        usage: { count: usage?.count ?? 0, bytes: usage?.bytes ?? 0 },
      };
    },
  };
};
