import type { DataJobsController } from "./createDataJobsController.js";
import { createButton } from "./createButton.js";
import { createElement } from "./createElement.js";
import type { DataJobsPanelState } from "./dataJobsPanelState.js";
import { renderJob } from "./renderJob.js";

const renderJobs = (
  document: Document,
  controller: DataJobsController,
  state: DataJobsPanelState,
) => {
  if (state.loading)
    return createElement(document, "p", { role: "status" }, [
      "Loading data jobs…",
    ]);
  if (!state.jobs.length)
    return createElement(document, "p", {}, ["No data jobs are registered."]);
  return createElement(
    document,
    "div",
    { class: "data-jobs-list" },
    state.jobs.map((job) => renderJob(document, controller, job, state)),
  );
};

export const renderPanel = (
  document: Document,
  controller: DataJobsController,
  state: DataJobsPanelState,
) =>
  createElement(
    document,
    "section",
    { class: "data-jobs-panel", "aria-label": "Data jobs" },
    [
      createElement(document, "div", { class: "section-heading" }, [
        createElement(document, "h2", {}, ["Data jobs"]),
        createButton(document, "Refresh", () => void controller.refresh(), {
          disabled: state.busyJobId !== undefined,
          secondary: true,
        }),
      ]),
      state.error &&
        createElement(document, "p", { role: "alert" }, [state.error]),
      state.busyJobId &&
        createElement(document, "p", { role: "status" }, ["Working…"]),
      renderJobs(document, controller, state),
    ],
  );
