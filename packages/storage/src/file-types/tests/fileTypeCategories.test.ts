import { expect, it } from "vitest";
import { createFileTypeRegistry } from "../createFileTypeRegistry";

it("classifies builtins and aliases while keeping archives and unknown formats separate", () => {
  const registry = createFileTypeRegistry();
  for (const [id, category] of Object.entries({
    "image/png": "image",
    "image/svg+xml": "image",
    "audio/mpeg": "audio",
    "video/mp4": "video",
    "application/pdf": "document",
    "application/msword": "document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "document",
    "text/plain": "document",
    "application/zip": "other",
    "application/octet-stream": "other",
  }))
    expect(registry.get(id)?.category).toBe(category);
  expect(registry.get("image/jpg")?.category).toBe("image");
});

it("supports explicit custom categories and rejects invalid ones", () => {
  expect(
    createFileTypeRegistry({
      types: [{ id: "application/x-example", category: "document" }],
    }).get("application/x-example")?.category,
  ).toBe("document");

  expect(() =>
    createFileTypeRegistry({
      types: [{ id: "application/x-example", category: "admin" as never }],
    }),
  ).toThrow();
});
