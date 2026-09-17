import { createCallerFactory, createContext } from "@mp-lb/inproduct-server";
import { describe, expect, it } from "vitest";
import { appRouter } from ".";

const createCaller = createCallerFactory(appRouter);

describe("appRouter", () => {
  it("greets and reads the greeting back", async () => {
    const caller = createCaller(createContext());

    await caller.greet({ name: "Ada" });

    expect(await caller.greeting({ name: "Ada" })).toEqual({
      message: "Hello, Ada.",
    });
  });

  it("throws NotFoundError for an unknown greeting", async () => {
    const caller = createCaller(createContext());

    await expect(caller.greeting({ name: "Nobody" })).rejects.toThrow(
      /no greeting/,
    );
  });
});
