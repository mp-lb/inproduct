import { describe, expect, it } from "vitest";
import { createDataJobsTRPCClient } from "../createDataJobsTRPCClient";
import { runDataJobSchema } from "../dataJobSchemas";
import { createDataJobRunner } from "../runner/createDataJobRunner";
import { createFakeJob } from "./createFakeJob";

describe("createDataJobsTRPCClient", () => {
  it("maps panel operations onto host tRPC procedures", async () => {
    const runner = createDataJobRunner({ jobs: [createFakeJob().job] });

    const client = createDataJobsTRPCClient({
      list: { query: async () => runner.list() },
      inspect: { mutate: ({ id }) => runner.inspect(id) },
      run: { mutate: (input) => runner.run(runDataJobSchema.parse(input)) },
      verify: { query: ({ id }) => runner.verify(id) },
    });

    expect((await client.list()).map((job) => job.id)).toEqual([
      "clear-pending",
    ]);

    const preview = await client.inspect("clear-pending");
    expect(
      (
        await client.run({
          id: "clear-pending",
          confirmationToken: preview.confirmationToken,
        })
      ).status,
    ).toBe("succeeded");

    expect((await client.verify("clear-pending")).passed).toBe(true);
  });

  it("procedure input schemas accept only a job selection", () => {
    expect(() =>
      runDataJobSchema.parse({
        id: "clear-pending",
        confirmationToken: "t",
        collection: "users",
      }),
    ).toThrow();

    expect(() =>
      runDataJobSchema.parse({ id: "../users", confirmationToken: "t" }),
    ).toThrow();
  });
});
