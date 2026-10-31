import type { DataJobsClient } from "../dataJobTypes.js";
import { describeFailure } from "../runner/describeFailure.js";
import type { DataJobsPanelState } from "./dataJobsPanelState.js";

export type DataJobsController = ReturnType<typeof createDataJobsController>;

/** Framework-free panel state. Subscribe from any UI layer; the standard panel uses it directly.
 * While a run is in flight the job list is polled every `pollMs` to show progress.
 */
export const createDataJobsController = (
  client: DataJobsClient,
  { pollMs = 500 }: { pollMs?: number } = {},
) => {
  let state: DataJobsPanelState = {
    jobs: [],
    loading: true,
    acceptDataLoss: false,
    results: {},
    verifications: {},
  };
  const listeners = new Set<(state: DataJobsPanelState) => void>();

  const update = (change: Partial<DataJobsPanelState>) => {
    state = { ...state, ...change };
    for (const listener of listeners) listener(state);
  };

  const reload = async () =>
    update({ jobs: await client.list(), loading: false });

  const perform = async (jobId: string, operation: () => Promise<void>) => {
    if (state.busyJobId) return;
    update({ busyJobId: jobId, error: undefined });

    try {
      await operation();
    } catch (error) {
      update({ error: describeFailure(error) });
    } finally {
      update({ busyJobId: undefined });
    }
  };

  return {
    getState: () => state,
    subscribe: (listener: (state: DataJobsPanelState) => void) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    refresh: () =>
      reload().catch((error: unknown) =>
        update({ loading: false, error: describeFailure(error) }),
      ),
    inspect: (id: string) =>
      perform(id, async () => {
        update({ preview: undefined, acceptDataLoss: false });
        update({ preview: await client.inspect(id) });
      }),
    cancel: () => update({ preview: undefined, acceptDataLoss: false }),
    setAcceptDataLoss: (acceptDataLoss: boolean) => update({ acceptDataLoss }),
    run: () => {
      const { preview, acceptDataLoss } = state;
      if (!preview) return Promise.resolve();
      const { id } = preview.job;
      return perform(id, async () => {
        // A confirmation is single-use: the preview closes whatever the outcome.
        update({ preview: undefined, acceptDataLoss: false });

        const polling = setInterval(
          () => void reload().catch(() => undefined),
          pollMs,
        );

        try {
          const result = await client.run({
            id,
            confirmationToken: preview.confirmationToken,
            acceptDataLoss,
          });

          update({ results: { ...state.results, [id]: result } });
        } finally {
          clearInterval(polling);
          await reload().catch(() => undefined);
        }
      });
    },
    verify: (id: string) =>
      perform(id, async () => {
        const verification = await client.verify(id);
        update({
          verifications: { ...state.verifications, [id]: verification },
        });
      }),
  };
};
