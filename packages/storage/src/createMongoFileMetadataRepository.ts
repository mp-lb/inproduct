import type { Db } from "mongodb";
import type { FileLink } from "./file-library/fileLinks.js";

export type FileMetadataPartition<
  TFile extends { id: string; tenantId: string },
  TAudit,
  TSettings extends object = object,
> = {
  _id: string;
  revision: number;
  files: TFile[];
  audit: TAudit[];
  links?: FileLink[];
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
  linksCollectionName?: string,
): FileMetadataRepository<TFile, TAudit, TSettings> => {
  if (!collectionName.trim())
    throw new TypeError("collection name is required");

  if (
    linksCollectionName !== undefined &&
    (!linksCollectionName.trim() ||
      [collectionName, `${collectionName}Settings`].includes(
        linksCollectionName,
      ))
  )
    throw new TypeError("links collection must have a distinct name");

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

  const links = linksCollectionName
    ? db.collection<FileLink & { tenantId: string }>(linksCollectionName)
    : undefined;

  const linkIndexes = links
    ? Promise.all([
        links.createIndex(
          { tenantId: 1, fileId: 1, type: 1, targetId: 1 },
          { unique: true },
        ),
        links.createIndex({ tenantId: 1, type: 1, targetId: 1 }),
      ])
    : undefined;

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
      await linkIndexes;
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
              ...(links
                ? {
                    links: (
                      await links.find({ tenantId }, { session }).toArray()
                    ).map(({ fileId, type, targetId }) => ({
                      fileId,
                      type,
                      targetId,
                    })),
                  }
                : {}),
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
      await linkIndexes;
      const session = db.client.startSession();
      let saved = false;

      try {
        await session.withTransaction(
          async () => {
            saved = false;
            const { files: records, links: associations, ...control } = next;
            if (associations?.length && !links)
              throw new TypeError("links collection is not configured");

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

            if (links) {
              await links.deleteMany({ tenantId: next._id }, { session });

              if (associations?.length) {
                const ids = new Set(records.map((file) => file.id));
                if (associations.some((link) => !ids.has(link.fileId)))
                  throw new TypeError("link file does not exist in partition");
                await links.insertMany(
                  associations.map((link) => ({ ...link, tenantId: next._id })),
                  { session },
                );
              }
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
