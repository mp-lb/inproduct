# @mp-lb/inproduct-data-jobs

MongoDB data jobs for applications that own their data. Register jobs such as
cleanups, backfills, repairs and resets in code. Operators can then inspect, confirm,
run and verify them from a framework-free admin panel or a CLI. Both use one runner
and the same structured results. Requires Node.js 22.13+ and ESM.

```sh
pnpm add @mp-lb/inproduct-data-jobs mongodb
```

```ts
import { createDataJobRunner } from "@mp-lb/inproduct-data-jobs";
import { createRemoveFieldsJob } from "@mp-lb/inproduct-data-jobs/mongodb";

const runner = createDataJobRunner({
  jobs: [
    createRemoveFieldsJob({
      id: "remove-legacy-fields",
      title: "Remove legacy fields",
      description: "Removes retired fields from archived products.",
      collection: db.collection("products"),
      fields: ["legacyPrice", "internal.notes"],
      filter: { status: "archived" },
    }),
  ],
});

const preview = await runner.inspect("remove-legacy-fields");
const result = await runner.run({
  id: "remove-legacy-fields",
  confirmationToken: preview.confirmationToken,
  acceptDataLoss: true,
});
```

## Entry points

- `.`: the runner, `defineDataJob` for your own jobs, `DataJobError` and the tRPC input schemas.
- `/mongodb`: the built-in Remove fields job.
- `/trpc`: adapts your authorized tRPC router for the panel.
- `/panel`: `mountDataJobsPanel`, a DOM panel that needs no framework, plus a headless controller.
- `/cli`: `runDataJobsCli`, for a script you own.

Duplicate runs are rejected only within one runner process. Path semantics, how
confirmation works and what is out of scope are covered in the
[data jobs guide](../../docs/public/data-jobs.mdx).
