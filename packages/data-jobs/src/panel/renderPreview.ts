import { describeRetryPolicy } from "../describeRetryPolicy.js";
import type { DataJobPreview } from "../dataJobTypes.js";
import type { DataJobsController } from "./createDataJobsController.js";
import { createButton } from "./createButton.js";
import { createDetails } from "./createDetails.js";
import { createElement } from "./createElement.js";

const renderChanges = (document: Document, preview: DataJobPreview) =>
  createElement(document, "table", {}, [
    createElement(document, "thead", {}, [
      createElement(document, "tr", {}, [
        createElement(document, "th", { scope: "col" }, ["Change"]),
        createElement(document, "th", { scope: "col" }, ["Documents"]),
      ]),
    ]),
    createElement(
      document,
      "tbody",
      {},
      preview.inspection.changes.map((change) =>
        createElement(document, "tr", {}, [
          createElement(document, "td", {}, [change.label]),
          createElement(document, "td", {}, [String(change.count)]),
        ]),
      ),
    ),
  ]);

const renderDataLossConsent = (
  document: Document,
  controller: DataJobsController,
  accepted: boolean,
) => {
  const checkbox = createElement(document, "input", {
    type: "checkbox",
    checked: accepted,
    "data-focus-key": "accept-data-loss",
  });

  checkbox.addEventListener("change", () =>
    controller.setAcceptDataLoss((checkbox as HTMLInputElement).checked),
  );

  return createElement(document, "label", {}, [
    checkbox,
    " I understand this permanently deletes data",
  ]);
};

/** Everything an operator must see before confirming, plus the confirmation controls. */
export const renderPreview = (
  document: Document,
  controller: DataJobsController,
  preview: DataJobPreview,
  { accepted, busy }: { accepted: boolean; busy: boolean },
) => {
  const { job, inspection } = preview;
  const canRun = !busy && (!job.destructive || accepted);
  return createElement(
    document,
    "section",
    { class: "data-job-preview", "aria-label": `Preview ${job.title}` },
    [
      createElement(document, "h4", {}, ["Preview"]),
      createElement(document, "p", {}, [inspection.summary]),
      renderChanges(document, preview),
      createDetails(document, [
        ["Scope", job.scope],
        ["Deletes data", job.destructive ? "Yes" : "No"],
        ["Retry policy", describeRetryPolicy(job.retryPolicy)],
      ]),
      ...inspection.warnings.map((warning) =>
        createElement(document, "p", { class: "data-job-warning" }, [warning]),
      ),
      job.destructive && renderDataLossConsent(document, controller, accepted),
      createElement(document, "div", { class: "actions" }, [
        createButton(document, "Confirm and run", () => void controller.run(), {
          disabled: !canRun,
          focusKey: "run",
        }),
        createButton(document, "Cancel", controller.cancel, {
          disabled: busy,
          secondary: true,
          focusKey: "cancel",
        }),
      ]),
    ],
  );
};
