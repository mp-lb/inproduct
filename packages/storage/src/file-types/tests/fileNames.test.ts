import { describe, expect, it } from "vitest";
import { contentDisposition } from "../contentDisposition";
import { defaultFileTypeRegistry } from "../defaultFileTypeRegistry";
import { deriveFileName } from "../deriveFileName";
import { downloadFileName } from "../downloadFileName";
import { findFileExtension } from "../findFileExtension";
import { sanitizeFileName } from "../sanitizeFileName";
import { stripTypeExtension } from "../stripTypeExtension";

const registry = defaultFileTypeRegistry();

const derive = (fileName: string, type: string) =>
  deriveFileName(fileName, registry.get(type)!, registry);

describe("file names", () => {
  it("splits a compatible extension and preserves dots in the name", () => {
    expect(derive("Q3 report.v2.final.PDF", "application/pdf")).toEqual({
      name: "Q3 report.v2.final",
      extension: "pdf",
    });

    expect(derive("photo.jpeg", "image/jpeg")).toEqual({
      name: "photo",
      extension: "jpeg",
    });
  });

  it("keeps multi-part extensions together", () => {
    expect(derive("backup.2026.tar.gz", "application/gzip")).toEqual({
      name: "backup.2026",
      extension: "tar.gz",
    });

    expect(findFileExtension("backup.tar.gz", registry)).toEqual({
      stem: "backup",
      extension: "tar.gz",
      registered: true,
    });
  });

  it("adds the preferred extension to extensionless and hidden names", () => {
    expect(derive("README", "text/plain")).toEqual({
      name: "README",
      extension: "txt",
    });

    expect(derive(".env", "text/plain")).toEqual({
      name: ".env",
      extension: "txt",
    });
  });

  it("keeps a suffix the type does not list in the name", () => {
    expect(derive("scan.png", "application/pdf")).toEqual({
      name: "scan.png",
      extension: "pdf",
    });

    expect(derive("Version 1.2", "text/plain")).toEqual({
      name: "Version 1.2",
      extension: "txt",
    });
  });

  it("pins an unregistered extension on unknown binary files", () => {
    expect(derive("capture.dat3", "application/octet-stream")).toEqual({
      name: "capture",
      extension: "dat3",
    });

    expect(derive("notes.html", "application/octet-stream")).toEqual({
      name: "notes",
      extension: "html",
    });

    expect(derive("survey", "application/octet-stream")).toEqual({
      name: "survey",
      extension: null,
    });

    expect(derive("survey.123", "application/octet-stream")).toEqual({
      name: "survey",
      extension: "123",
    });
  });

  it("strips only an extension the file already has from a rename", () => {
    expect(stripTypeExtension("Board pack.PDF", ["pdf"])).toBe("Board pack");
    expect(stripTypeExtension("Board pack.docx", ["pdf"])).toBe(
      "Board pack.docx",
    );

    expect(stripTypeExtension(".pdf", ["pdf"])).toBe(".pdf");
  });
});

describe("safe download names", () => {
  it("removes path, control, reserved and bidirectional-override characters", () => {
    expect(sanitizeFileName("../a\r\nb:c*?.txt")).toBe("_a__b_c__.txt");
    expect(sanitizeFileName("invoice‮gpj.exe")).toBe("invoicegpj.exe");
    expect(sanitizeFileName("CON")).toBe("_CON");
    expect(sanitizeFileName(" ...  ")).toBe("file");
  });

  it("bounds the encoded length without splitting characters", () => {
    const name = sanitizeFileName("é".repeat(300));
    expect(new TextEncoder().encode(name).length).toBeLessThanOrEqual(200);
    expect(name).toBe("é".repeat(100));
  });

  it("always ends in the record's extension, whatever the editable name says", () => {
    expect(downloadFileName("invoice.html", "pdf")).toBe("invoice.html.pdf");
    expect(downloadFileName("notes", null)).toBe("notes");
    expect(downloadFileName("notes", "../x")).toBe("notes");
  });

  it("produces injection-free attachment headers with an ASCII fallback", () => {
    expect(contentDisposition('Résumé "final"\r\nX-Evil: 1.pdf')).toBe(
      `attachment; filename="R_sum_ _final___X-Evil_ 1.pdf"; filename*=UTF-8''R%C3%A9sum%C3%A9%20_final___X-Evil_%201.pdf`,
    );
  });
});
