import { describe, expect, it } from "vitest";
import { slugify } from ".";

describe("slugify", () => {
  it.each([
    ["  Hello, World! ", "hello-world"],
    ["A___B---C", "a-b-c"],
    ["Product 123", "product-123"],
    ["", ""],
    ["!!!", ""],
    ["日本語", ""],
    ["Café", "caf"],
  ])("converts %j to %j", (input, expected) => {
    expect(slugify(input)).toBe(expected);
    expect(slugify(slugify(input))).toBe(expected);
  });
});
