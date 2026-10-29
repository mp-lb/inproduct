import { describe, expect, it } from "vitest";
import { detectFileContent } from "../detectFileContent";
import { defaultFileTypeRegistry } from "../defaultFileTypeRegistry";
import { matchFileContent } from "../matchFileContent";
import { contentFixtures as fixture } from "./contentFixtures";

const registry = defaultFileTypeRegistry();

const match = (bytes: Uint8Array, type: string) =>
  matchFileContent(detectFileContent(bytes), registry.get(type)!);

describe("content detection", () => {
  it("recognizes binary signatures and container refinements", () => {
    expect(detectFileContent(fixture.pdf).types).toEqual(["application/pdf"]);
    expect(detectFileContent(fixture.gif).types).toEqual(["image/gif"]);
    expect(detectFileContent(fixture.heic)).toEqual({
      types: ["image/heic"],
      container: "iso-bmff",
    });

    expect(detectFileContent(fixture.webp).types).toEqual(["image/webp"]);
    expect(detectFileContent(fixture.wav).types).toEqual(["audio/wav"]);
    expect(detectFileContent(fixture.webm).types).toContain("video/webm");
    expect(detectFileContent(fixture.odt).types).toEqual([
      "application/zip",
      "application/vnd.oasis.opendocument.text",
    ]);
  });

  it("classifies text and flags active markup", () => {
    expect(detectFileContent(fixture.json).types).toEqual([
      "text/plain",
      "application/json",
    ]);

    expect(detectFileContent(fixture.html).types).toEqual(["text/html"]);
    expect(detectFileContent(fixture.svg).types).toEqual(["image/svg+xml"]);
  });

  it("does not mistake text for weak binary signatures", () => {
    expect(detectFileContent(fixture.bmwText).types).toEqual(["text/plain"]);
    expect(detectFileContent(fixture.mzText).types).toEqual(["text/plain"]);
    expect(detectFileContent(fixture.exe).types).toEqual([
      "application/x-msdownload",
    ]);
  });

  it("reports nothing for empty or unrecognized bytes", () => {
    expect(detectFileContent(new Uint8Array())).toEqual({
      types: [],
      container: null,
    });

    expect(detectFileContent(fixture.binary)).toEqual({
      types: [],
      container: null,
    });
  });
});

describe("content matching", () => {
  it("is exact only for a positive identification", () => {
    expect(match(fixture.png, "image/png")).toBe("exact");
    expect(match(fixture.jpeg, "image/jpg")).toBe("exact");
    expect(
      match(
        fixture.docx,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toBe("exact");

    expect(match(fixture.text, "text/plain")).toBe("exact");
  });

  it("is compatible when bytes show only the type's container or text family", () => {
    expect(
      match(
        fixture.zip,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
    ).toBe("compatible");

    expect(match(fixture.ole, "application/msword")).toBe("compatible");
    expect(match(fixture.csv, "text/csv")).toBe("compatible");
    expect(match(fixture.typescript, "text/x-typescript")).toBe("compatible");
  });

  it("is a mismatch when bytes identify something else", () => {
    expect(match(fixture.png, "image/jpeg")).toBe("mismatch");
    expect(
      match(
        fixture.docx,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
    ).toBe("mismatch");

    expect(match(fixture.html, "text/plain")).toBe("mismatch");
    expect(match(fixture.html, "text/csv")).toBe("mismatch");
    expect(match(fixture.exe, "application/pdf")).toBe("mismatch");
    expect(match(fixture.typescript, "video/mp2t")).toBe("mismatch");
  });

  it("is unrecognized when no detector applies", () => {
    expect(match(fixture.binary, "application/octet-stream")).toBe(
      "unrecognized",
    );
  });
});
