// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFileStorage } from "./createFileStorage";
import type { FilePage } from "./fileTypes";
import { useFileStorage } from "./useFileStorage";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const empty: FilePage = {
  items: [],
  total: 0,
  nextOffset: null,
  usage: { count: 0, bytes: 0 },
};

const deferred = <T>() => {
  let resolve!: (value: T) => void;

  const promise = new Promise<T>((done) => {
    resolve = done;
  });

  return { promise, resolve };
};

describe("useFileStorage", () => {
  it("ignores stale searches and resets pagination when filters change", async () => {
    const old = deferred<FilePage>();
    const client = createFileStorage();
    vi.spyOn(client, "list")
      .mockReturnValueOnce(old.promise)
      .mockResolvedValue({ ...empty, total: 9 });

    const { result } = renderHook(() => useFileStorage(client, { offset: 25 }));
    await waitFor(() => expect(client.list).toHaveBeenCalled());
    act(() => result.current.setFilters({ search: "new" }));
    await waitFor(() => expect(result.current.total).toBe(9));
    await act(async () => old.resolve({ ...empty, total: 1 }));
    expect(result.current.total).toBe(9);
    expect(result.current.query.offset).toBe(0);
  });

  it("refreshes after writes and returns to page one after deleting the last row", async () => {
    const client = createFileStorage();
    await client.upload({ name: "first", body: new Uint8Array([1]) });
    const { result } = renderHook(() => useFileStorage(client, { limit: 1 }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      expect(
        await result.current.upload({
          name: "second",
          body: new Uint8Array([2]),
        }),
      ).toBe(true);
    });

    expect(result.current.usage?.count).toBe(2);
    act(() => result.current.nextPage());
    await waitFor(() => expect(result.current.files[0]?.name).toBe("first"));
    await act(async () => {
      await result.current.remove(result.current.files[0]!.id);
    });

    await waitFor(() => expect(result.current.files[0]?.name).toBe("second"));
    expect(result.current.query.offset).toBe(0);
  });

  it("reports failures, releases the mutation lock and lets the caller retry", async () => {
    const client = createFileStorage({ maxBytes: 0 });
    const { result } = renderHook(() => useFileStorage(client));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      expect(
        await result.current.upload({
          name: "large",
          body: new Uint8Array([1]),
        }),
      ).toBe(false);
    });

    expect(result.current.error).toContain("byte limit");
    expect(result.current.busy).toBe(false);
    await act(async () => {
      expect(
        await result.current.upload({ name: "empty", body: new Uint8Array() }),
      ).toBe(true);
    });

    expect(result.current.error).toBeUndefined();
    expect(result.current.files).toHaveLength(1);
  });

  it("uploads browser files and prevents duplicate actions while a write is pending", async () => {
    const client = createFileStorage();
    const bytes = deferred<ArrayBuffer>();
    const file = new File(["abc"], "receipt.txt", { type: "text/plain" });
    Object.defineProperty(file, "arrayBuffer", { value: () => bytes.promise });
    const { result } = renderHook(() => useFileStorage(client));
    await waitFor(() => expect(result.current.loading).toBe(false));
    let pending!: Promise<boolean>;
    act(() => {
      pending = result.current.uploadFile(file, { tags: ["receipt"] });
    });

    await act(async () => {
      expect(await result.current.uploadFile(file)).toBe(false);
      bytes.resolve(new Uint8Array([97, 98, 99]).buffer);
      expect(await pending).toBe(true);
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0]).toMatchObject({
      name: "receipt.txt",
      sizeBytes: 3,
      contentType: "text/plain",
      tags: ["receipt"],
    });

    expect((await client.download(result.current.files[0]!.id)).body).toEqual(
      new Uint8Array([97, 98, 99]),
    );
  });

  it("does not replace a new client's files with an old pending response", async () => {
    const old = deferred<FilePage>();
    const first = createFileStorage();
    const second = createFileStorage();
    vi.spyOn(first, "list").mockReturnValue(old.promise);
    await second.upload({ name: "new client", body: new Uint8Array() });

    const { result, rerender } = renderHook(
      ({ client }) => useFileStorage(client),
      { initialProps: { client: first } },
    );

    await waitFor(() => expect(first.list).toHaveBeenCalled());
    rerender({ client: second });
    await waitFor(() =>
      expect(result.current.files[0]?.name).toBe("new client"),
    );

    await act(async () => old.resolve(empty));
    expect(result.current.files[0]?.name).toBe("new client");
  });

  it("downloads the actual bytes with the edited filename and revokes the blob URL", async () => {
    const client = createFileStorage();

    const file = await client.upload({
      name: "original",
      body: new Uint8Array([5]),
    });

    await client.edit(file.id, {
      name: "renamed.txt",
      tags: [],
    });

    const createObjectURL = vi
      .fn<(blob: Blob) => string>()
      .mockReturnValue("blob:test");

    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    let filename = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      filename = this.download;
    });

    const { result } = renderHook(() => useFileStorage(client));
    await waitFor(() => expect(result.current.loading).toBe(false));
    vi.useFakeTimers();

    try {
      await act(async () => {
        expect(await result.current.download(file.id)).toBe(true);
      });

      expect(filename).toBe("renamed.txt");
      expect(createObjectURL.mock.calls[0]?.[0]).toMatchObject({ size: 1 });
      act(() => vi.runAllTimers());
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
    } finally {
      vi.useRealTimers();
    }
  });
});
