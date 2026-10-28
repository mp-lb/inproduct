import { describe, expect, it, vi } from "vitest";
import { createFileAuditDispatcher } from "../createFileAuditDispatcher";
import type { FileAudit } from "../fileLibraryContracts";
import type { FileAuditLedger } from "../fileAuditLedger";
import { maxPendingAudit } from "../maxPendingAudit";
import { createFixture, metadata, owner } from "./fileLibraryFixture";

const createLedger = () => {
  const events = new Map<string, FileAudit>();

  const ledger: FileAuditLedger = {
    append: async (tenantId, batch) => {
      for (const event of batch)
        if (!events.has(`${tenantId}/${event.id}`))
          events.set(`${tenantId}/${event.id}`, event);
    },
  };

  return { events, ledger };
};

describe("file library audit recovery", () => {
  it("retains audit after a failed append and deduplicates the retry", async () => {
    const { options, ready } = createFixture();
    await ready();
    const { events, ledger } = createLedger();

    const append = vi
      .spyOn(ledger, "append")
      .mockRejectedValueOnce(new Error("ledger outage"));

    const dispatch = createFileAuditDispatcher(options.repository, ledger);

    await expect(dispatch(owner.tenantId)).rejects.toThrow("ledger outage");
    const pending = (await options.repository.read(owner.tenantId)).audit;
    expect(pending.length).toBeGreaterThan(0);

    expect(await dispatch(owner.tenantId)).toBe(pending.length);
    expect(await dispatch(owner.tenantId)).toBe(0);
    expect(events.size).toBe(pending.length);
    expect(append).toHaveBeenCalledTimes(2);
  });

  it("acknowledges only delivered IDs and preserves events added concurrently", async () => {
    const { library, options, ready } = createFixture();
    await ready();
    const { events, ledger } = createLedger();
    const original = ledger.append;

    ledger.append = async (tenantId, batch) => {
      await original(tenantId, batch);
      await library.begin(owner, metadata());
    };

    const dispatch = createFileAuditDispatcher(options.repository, ledger);
    const delivered = await dispatch(owner.tenantId);

    const remaining = (await options.repository.read(owner.tenantId)).audit;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].eventType).toBe("file.upload.requested");
    expect(events.size).toBe(delivered);
  });

  it("retries an acknowledgment whose committed save lost its response", async () => {
    const { options, ready } = createFixture();
    await ready();
    const { ledger } = createLedger();
    const save = options.repository.save;
    let lost = false;

    const repository = {
      read: options.repository.read,
      save: async (...args: Parameters<typeof save>) => {
        const saved = await save(...args);

        if (!lost) {
          lost = true;
          throw new Error("response lost");
        }

        return saved;
      },
    };

    const dispatch = createFileAuditDispatcher(repository, ledger);
    await expect(dispatch(owner.tenantId)).rejects.toThrow("response lost");
    expect((await options.repository.read(owner.tenantId)).audit).toEqual([]);
    expect(await dispatch(owner.tenantId)).toBe(0);
  });

  it("applies audit backpressure without a partial mutation", async () => {
    const { library, options, ready } = createFixture();
    const id = await ready();
    const partition = await options.repository.read(owner.tenantId);
    const filler = partition.audit[0];
    const previous = partition.revision;
    partition.audit = Array.from({ length: maxPendingAudit }, (_, index) => ({
      ...filler,
      id: `filler-${index}`,
    }));

    partition.revision++;
    await options.repository.save(partition, previous);
    const before = await options.repository.read(owner.tenantId);

    await expect(
      library.edit(owner, {
        fileId: id,
        revision: before.files[0].revision,
        name: "renamed.txt",
        tags: [],
      }),
    ).rejects.toThrow("audit delivery required");

    expect(await options.repository.read(owner.tenantId)).toEqual(before);

    const { ledger } = createLedger();
    await createFileAuditDispatcher(options.repository, ledger)(owner.tenantId);
    const after = await options.repository.read(owner.tenantId);
    expect(
      (
        await library.edit(owner, {
          fileId: id,
          revision: after.files[0].revision,
          name: "renamed.txt",
          tags: [],
        })
      ).name,
    ).toBe("renamed.txt");
  });
});
