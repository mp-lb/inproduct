import { describe, expect, it } from "vitest";
import { defaultFileTypeRegistry } from "../defaultFileTypeRegistry";
import { identifyFileType } from "../identifyFileType";
import { contentFixtures as fixture } from "./contentFixtures";

const registry = defaultFileTypeRegistry();

const identify = (input: Parameters<typeof identifyFileType>[0]) =>
  identifyFileType(input, registry);

describe("file type identification", () => {
  it("infers from the name or the reported type alone", () => {
    expect(identify({ fileName: "Board pack.pdf" })).toMatchObject({
      status: "inferred",
      type: { id: "pdf", mediaType: "application/pdf" },
      conflicts: [],
    });

    expect(identify({ declaredType: "image/jpg" })).toMatchObject({
      status: "inferred",
      type: { id: "jpeg", mediaType: "image/jpeg" },
    });
  });

  it("treats octet-stream and empty reported types as no evidence", () => {
    expect(
      identify({ fileName: "a.pdf", declaredType: "application/octet-stream" }),
    ).toMatchObject({
      status: "inferred",
      type: { id: "pdf", mediaType: "application/pdf" },
    });

    expect(identify({ fileName: "a.pdf", declaredType: "" }).status).toBe(
      "inferred",
    );
  });

  it("reports unknown when there is no usable evidence", () => {
    expect(identify({ fileName: "capture.zzz9" })).toMatchObject({
      status: "unknown",
      type: null,
    });

    expect(identify({ fileName: "data", bytes: fixture.binary })).toMatchObject(
      { status: "unknown", type: null },
    );
  });

  it("reports a name/type conflict without choosing", () => {
    const result = identify({
      fileName: "photo.png",
      declaredType: "image/jpeg",
    });

    expect(result).toMatchObject({
      status: "conflict",
      type: null,
      conflicts: ["extension-declared"],
    });

    expect(result.candidates.map((type) => type.id)).toEqual(["jpeg", "png"]);
  });

  it("lets bytes settle a conflict but keeps it on record", () => {
    expect(
      identify({
        fileName: "photo.png",
        declaredType: "image/jpeg",
        bytes: fixture.jpeg,
      }),
    ).toMatchObject({
      status: "recognized",
      type: { id: "jpeg", mediaType: "image/jpeg" },
      conflicts: ["extension-declared", "content-extension"],
    });
  });

  it("separates recognition from compatibility", () => {
    expect(
      identify({ fileName: "totals.csv", bytes: fixture.csv }),
    ).toMatchObject({
      status: "compatible",
      type: { id: "csv", mediaType: "text/csv" },
    });

    expect(identify({ fileName: "a.png", bytes: fixture.png }).status).toBe(
      "recognized",
    );
  });

  it("uses bytes to resolve an ambiguous extension", () => {
    expect(
      identify({
        fileName: "server.ts",
        declaredType: "video/mp2t",
        bytes: fixture.typescript,
      }),
    ).toMatchObject({
      status: "compatible",
      type: {
        id: "format-text-2f-x-2d-typescript",
        mediaType: "text/x-typescript",
      },
      conflicts: ["content-declared"],
    });
  });

  it("reports content that contradicts every claim", () => {
    expect(
      identify({ fileName: "notes.txt", bytes: fixture.html }),
    ).toMatchObject({
      status: "conflict",
      type: { id: "html", mediaType: "text/html" },
      conflicts: ["content-extension"],
    });
  });

  it("identifies from content when nothing is claimed", () => {
    expect(identify({ bytes: fixture.pdf })).toMatchObject({
      status: "recognized",
      type: { id: "pdf", mediaType: "application/pdf" },
    });
  });

  it("records the evidence it used", () => {
    expect(
      identify({ fileName: "x.JPG", declaredType: "image/pjpeg" }).evidence,
    ).toEqual({
      extension: { value: "jpg", types: ["jpeg"] },
      declared: { value: "image/pjpeg", type: "jpeg" },
      content: null,
    });
  });
});
