import { describe, expect, it } from "vitest";
import { defaultFileTypeRegistry } from "../defaultFileTypeRegistry";
import { describeFileDownload } from "../describeFileDownload";

const registry = defaultFileTypeRegistry();

describe("download response policy", () => {
  it("serves a recognized passive type as an attachment", () => {
    expect(
      describeFileDownload({
        name: "Board pack",
        extension: "pdf",
        type: registry.get("application/pdf"),
        status: "recognized",
      }),
    ).toEqual({
      fileName: "Board pack.pdf",
      contentType: "application/pdf",
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          "attachment; filename=\"Board pack.pdf\"; filename*=UTF-8''Board%20pack.pdf",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });

  it("falls back to octet-stream for inferred, unknown and active types", () => {
    for (const [type, status] of [
      ["application/pdf", "inferred"],
      ["text/csv", "compatible"],
      ["image/svg+xml", "recognized"],
      ["text/html", "recognized"],
    ] as const)
      expect(
        describeFileDownload({
          name: "x",
          extension: "bin",
          type: registry.get(type),
          status,
        }).contentType,
      ).toBe("application/octet-stream");
  });
});
