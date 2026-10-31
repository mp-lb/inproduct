import { describe, expect, it } from "vitest";
import { assertFieldPaths } from "../remove-fields/assertFieldPaths";

describe("assertFieldPaths", () => {
  it("accepts top-level and nested object paths", () => {
    expect(() =>
      assertFieldPaths(["legacyPrice", "internal.notes", "a.b.c"]),
    ).not.toThrow();
  });

  it.each([
    [[], "at least one"],
    [[""], "is empty"],
    [["a..b"], "empty segment"],
    [["$set"], "operator segment"],
    [["items.$[].name"], "operator segment"],
    [["items.0.name"], "array index"],
    [["_id"], "targets _id"],
    [["_id.part"], "targets _id"],
    [["a", "a"], "overlap"],
    [["a.b", "a"], "overlap"],
    [["x".repeat(201)], "longer than 200"],
  ])("rejects %j", (fields, message) => {
    expect(() => assertFieldPaths(fields)).toThrow(message);
  });

  it("treats sibling prefixes as distinct paths", () => {
    expect(() => assertFieldPaths(["note", "notes"])).not.toThrow();
  });
});
