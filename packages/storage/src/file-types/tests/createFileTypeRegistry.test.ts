import { describe, expect, it } from "vitest";
import { createFileTypeRegistry } from "../createFileTypeRegistry";
import { defaultFileTypeRegistry } from "../defaultFileTypeRegistry";

describe("file type registry", () => {
  const registry = defaultFileTypeRegistry();

  it("covers mime-db broadly with labels, stable ids and preferred extensions", () => {
    expect(registry.list().length).toBeGreaterThan(2000);
    expect(registry.get("application/pdf")).toMatchObject({
      id: "application/pdf",
      label: "PDF document",
      extensions: ["pdf"],
      source: "iana",
    });

    expect(registry.get("image/jpeg")?.extensions.slice(0, 2)).toEqual([
      "jpg",
      "jpeg",
    ]);

    expect(registry.get("application/vnd.google-earth.kml+xml")?.label).toBe(
      "KML file",
    );
  });

  it("resolves aliases, case and header parameters to one canonical type", () => {
    expect(registry.get("IMAGE/JPG")?.id).toBe("image/jpeg");
    expect(registry.get("text/plain; charset=utf-8")?.id).toBe("text/plain");
    expect(registry.get("application/x-zip-compressed")?.id).toBe(
      "application/zip",
    );

    expect(registry.get("text/xml")?.id).toBe("application/xml");
    expect(registry.get("not a type")).toBeUndefined();
  });

  it("lists every type for ambiguous extensions with a deterministic preference", () => {
    const mp4 = registry.byExtension(".MP4");
    expect(mp4.ambiguous).toBe(true);
    expect(mp4.preferred?.id).toBe("video/mp4");
    expect(mp4.types.map((type) => type.id)).toContain("application/mp4");

    const ts = registry.byExtension("ts");
    expect(ts.types.map((type) => type.id)).toEqual([
      "video/mp2t",
      "text/x-typescript",
    ]);

    expect(registry.byExtension("exe").preferred?.id).toBe(
      "application/x-msdownload",
    );

    expect(registry.byExtension("zip").ambiguous).toBe(false);
  });

  it("knows multi-part extensions", () => {
    expect(registry.byExtension("tar.gz").preferred?.id).toBe(
      "application/gzip",
    );
  });

  it("adds custom types and overrides fields of built-in types", () => {
    const custom = createFileTypeRegistry({
      types: [
        {
          id: "application/vnd.acme.board+json",
          label: "Acme board",
          extensions: [".ACMEBOARD"],
          aliases: ["application/x-acme-board"],
        },
        { id: "application/pdf", label: "Portable document" },
      ],
      extensionPreferences: { ts: "text/x-typescript" },
    });

    expect(custom.get("application/x-acme-board")).toMatchObject({
      id: "application/vnd.acme.board+json",
      extensions: ["acmeboard"],
      textual: true,
      active: false,
      source: "custom",
    });

    expect(custom.get("application/pdf")).toMatchObject({
      label: "Portable document",
      extensions: ["pdf"],
      aliases: ["application/x-pdf", "application/acrobat"],
    });

    expect(custom.byExtension("ts").preferred?.id).toBe("text/x-typescript");
  });

  it("works without built-ins", () => {
    const only = createFileTypeRegistry({
      builtins: false,
      types: [{ id: "text/x-note", extensions: ["note"] }],
    });

    expect(only.list().map((type) => type.id)).toEqual(["text/x-note"]);
    expect(only.get("application/pdf")).toBeUndefined();
  });

  it("rejects invalid or contradictory definitions", () => {
    expect(() => createFileTypeRegistry({ types: [{ id: "pdf" }] })).toThrow(
      "invalid file type id",
    );

    expect(() =>
      createFileTypeRegistry({
        types: [{ id: "text/x-a", extensions: ["../x"] }],
      }),
    ).toThrow("invalid extension");

    expect(() =>
      createFileTypeRegistry({
        types: [{ id: "text/x-a", aliases: ["application/pdf"] }],
      }),
    ).toThrow("already defined");

    expect(() =>
      createFileTypeRegistry({ extensionPreferences: { pdf: "text/plain" } }),
    ).toThrow("does not list .pdf");
  });

  it("returns frozen definitions", () => {
    const type = registry.get("text/plain")!;
    expect(Object.isFrozen(type)).toBe(true);
    expect(Object.isFrozen(type.extensions)).toBe(true);
  });
});
