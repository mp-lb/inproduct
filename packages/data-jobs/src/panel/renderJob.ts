import { describeRetryPolicy } from "../describeRetryPolicy.js";
import type { DataJobSummary } from "../dataJobTypes.js";
import type { DataJobsController } from "./createDataJobsController.js";
import { createButton } from "./createButton.js";
import { createDetails } from "./createDetails.js";
import { createElement } from "./createElement.js";
import type { DataJobsPanelState } from "./dataJobsPanelState.js";
import { describeJobStatus } from "./describeJobStatus.js";
import { renderPreview } from "./renderPreview.js";
import { renderResult } from "./renderResult.js";
import { renderVerification } from "./renderVerification.js";

const latestResult = (job: DataJobSummary, state: DataJobsPanelState) =>
  job.state.status === "succeeded" || job.state.status === "failed"
    ? job.state
    : state.results[job.id];

export const renderJob = (
  document: Document,
  controller: DataJobsController,
  job: DataJobSummary,
  state: DataJobsPanelState,
) => {
  const busy = state.busyJobId !== undefined || job.state.status === "running";
  const preview = state.preview?.job.id === job.id ? state.preview : undefined;
  const result = latestResult(job, state);
  const verification = state.verifications[job.id];

  return createElement(
    document,
    "article",
    { class: "data-job", "aria-label": job.title },
    [
      createElement(document, "h3", {}, [job.title]),
      createElement(document, "p", {}, [job.description]),
      createDetails(document, [
        ["Scope", job.scope],
        ["Deletes data", job.destructive ? "Yes" : "No"],
        ["Retry policy", describeRetryPolicy(job.retryPolicy)],
        ["Status", describeJobStatus(job.state)],
      ]),
      job.state.status === "running" &&
        createElement(document, "p", { role: "status" }, [
          describeJobStatus(job.state),
        ]),
      createElement(document, "div", { class: "actions" }, [
        createButton(
          document,
          "Inspect",
          () => void controller.inspect(job.id),
          { disabled: busy, focusKey: `${job.id}:inspect` },
        ),
        createButton(document, "Verify", () => void controller.verify(job.id), {
          disabled: busy,
          secondary: true,
          focusKey: `${job.id}:verify`,
        }),
      ]),
      preview &&
        renderPreview(document, controller, preview, {
          accepted: state.acceptDataLoss,
          busy: state.busyJobId !== undefined,
        }),
      result && renderResult(document, result),
      verification && renderVerification(document, verification),
    ],
  );
};
