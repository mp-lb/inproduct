import type { Db } from "mongodb";

export type FileMetadataPartition<
  TFile extends { id: string; tenantId: string },
  TAudit,
  TSettings extends object = object,
> = {
  _id: string;
  revision: number;
  files: TFile[];
  audit: TAudit[];
} & TSettings;

export type FileMetadataRepository<
  TFile extends { id: string; tenantId: string },
  TAudit,
  TSettings extends object = object,
> = {
  read(
    tenantId: string,
  ): Promise<FileMetadataPartition<TFile, TAudit, TSettings>>;
  save(
    next: FileMetadataPartition<TFile, TAudit, TSettings>,
    expectedRevision: number,
  ): Promise<boolean>;
};

const indexes = new WeakMap<Db, Map<string, Promise<string>>>();

/**
 * Stores one metadata document per file in the named MongoDB collection.
 * File bytes remain in the host's object store. Quota and audit controls live
 * in a separate `${collectionName}Settings` collection.
 * @remarks Requires a MongoDB replica set for snapshot transactions.
 */
export const createMongoFileMetadataRepository = <
  TFile extends { id: string; tenantId: string },
  TAudit,
  TSettings extends object = object,
>(
  db: Db,
  collectionName: string,
): FileMetadataRepository<TFile, TAudit, TSettings> => {
  if (!collectionName.trim())
    throw new TypeError("collection name is required");

  type Partition = FileMetadataPartition<TFile, TAudit, TSettings>;
  type FileDocument = {
    _id: string;
    id: string;
    tenantId: string;
    [key: string]: unknown;
  };
  type SettingsDocument = {
    _id: string;
    revision: number;
    audit: unknown[];
    [key: string]: unknown;
  };

  const files = db.collection<FileDocument>(collectionName, {
    writeConcern: { w: "majority", j: true },
  });

  const settings = db.collection<SettingsDocument>(
    `${collectionName}Settings`,
    {
      writeConcern: { w: "majority", j: true },
    },
  );

  let databaseIndexes = indexes.get(db);

  if (!databaseIndexes) {
    databaseIndexes = new Map();
    indexes.set(db, databaseIndexes);
  }

  let ready = databaseIndexes.get(collectionName);

  if (!ready) {
    ready = files.createIndex({ tenantId: 1 });
    databaseIndexes.set(collectionName, ready);
  }

  return {
    read: async (tenantId) => {
      await ready;
      const session = db.client.startSession();

      try {
        let partition = {
          _id: tenantId,
          revision: 0,
          files: [],
          audit: [],
        } as unknown as Partition;

        await session.withTransaction(
          async () => {
            const control = await settings.findOne(
              { _id: tenantId },
              { session },
            );

            if (!control) return;

            const documents = await files
              .find({ tenantId }, { session })
              .toArray();

            partition = {
              ...control,
              files: documents.map((document) => {
                const record = { ...document };
                delete (record as Partial<FileDocument>)._id;
                return record as unknown as TFile;
              }),
            } as unknown as Partition;
          },
          { readConcern: { level: "snapshot" } },
        );

        return partition;
      } finally {
        await session.endSession();
      }
    },
    save: async (next, expectedRevision) => {
      await ready;
      const session = db.client.startSession();
      let saved = false;

      try {
        await session.withTransaction(
          async () => {
            saved = false;
            const { files: records, ...control } = next;

            if (expectedRevision === 0) {
              if (await settings.findOne({ _id: next._id }, { session }))
                return;
              await settings.insertOne(control as unknown as SettingsDocument, {
                session,
              });
            } else {
              const result = await settings.replaceOne(
                { _id: next._id, revision: expectedRevision },
                control as unknown as SettingsDocument,
                { session },
              );

              if (!result.matchedCount) return;
            }

            for (const record of records) {
              if (record.tenantId !== next._id)
                throw new TypeError("file tenant does not match partition");
              await files.replaceOne(
                { _id: record.id, tenantId: next._id },
                record as unknown as FileDocument,
                { upsert: true, session },
              );
            }

            saved = true;
          },
          {
            readConcern: { level: "snapshot" },
            writeConcern: { w: "majority", j: true },
          },
        );

        return saved;
      } catch (error) {
        if ((error as { code?: number }).code === 11000) return false;
        throw error;
      } finally {
        await session.endSession();
      }
    },
  };
};
