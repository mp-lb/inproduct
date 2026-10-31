import type { DataJobsClient } from "../dataJobTypes.js";
import { createDataJobsController } from "./createDataJobsController.js";
import { renderPanel } from "./renderPanel.js";
import { replacePreservingFocus } from "./replacePreservingFocus.js";

/** Renders the standard Data jobs panel into an element. Needs only the DOM, not a framework.
 * Markup uses plain elements and `data-job*` classes for host styling.
 * @example
 * const panel = mountDataJobsPanel(element, createDataJobsTRPCClient(trpc.dataJobs));
 * panel.destroy();
 */
export const mountDataJobsPanel = (
  element: HTMLElement,
  client: DataJobsClient,
  options?: { pollMs?: number },
) => {
  const document = element.ownerDocument;
  const controller = createDataJobsController(client, options);
  let mounted = true;
  let focusKey: string | undefined;

  const rememberFocus = (event: FocusEvent) => {
    focusKey =
      (event.target as HTMLElement).getAttribute("data-focus-key") ?? undefined;
  };

  element.addEventListener("focusin", rememberFocus);

  const render = () => {
    if (mounted)
      replacePreservingFocus(
        element,
        renderPanel(document, controller, controller.getState()),
        focusKey,
      );
  };

  const unsubscribe = controller.subscribe(render);
  render();
  void controller.refresh();

  return {
    controller,
    destroy: () => {
      mounted = false;
      unsubscribe();
      element.removeEventListener("focusin", rememberFocus);
      element.replaceChildren();
    },
  };
};
