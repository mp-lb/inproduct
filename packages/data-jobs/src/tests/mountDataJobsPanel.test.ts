// @vitest-environment jsdom
import {
  findByRole,
  findByText,
  getByRole,
  queryByRole,
  waitFor,
} from "@testing-library/dom";
import { afterEach, describe, expect, it } from "vitest";
import { mountDataJobsPanel } from "../panel/mountDataJobsPanel";
import { createDataJobRunner } from "../runner/createDataJobRunner";
import { createFakeJob } from "./createFakeJob";
import { createRunnerClient } from "./createRunnerClient";

// The panel re-renders on every state change, so always act on the current, enabled control.
const click = async (container: HTMLElement, name: string) =>
  (
    await waitFor(() => {
      const button = getByRole(container, "button", {
        name,
      }) as HTMLButtonElement;

      if (button.disabled) throw new Error(`${name} is disabled`);
      return button;
    })
  ).click();

const mounted: { destroy: () => void }[] = [];
afterEach(() => mounted.splice(0).forEach((panel) => panel.destroy()));

const mount = (overrides = {}) => {
  const fake = createFakeJob(overrides);
  const runner = createDataJobRunner({ jobs: [fake.job] });
  const element = document.createElement("div");
  document.body.append(element);
  mounted.push(
    mountDataJobsPanel(element, createRunnerClient(runner), { pollMs: 5 }),
  );

  return { ...fake, element, runner };
};

describe("mountDataJobsPanel", () => {
  it("shows metadata, previews, confirms and reports the verified result", async () => {
    const { element, data } = mount();

    const card = await findByRole(element, "article", {
      name: "Clear pending",
    });

    expect(card.textContent).toContain("Test counter");
    expect(card.textContent).toContain("Safe to rerun");
    expect(card.textContent).toContain("Deletes dataNo");

    await click(card, "Inspect");

    const preview = await findByRole(element, "region", {
      name: "Preview Clear pending",
    });

    expect(preview.textContent).toContain("Clear item3");
    expect(data.pending).toBe(3);

    await click(element, "Confirm and run");
    const result = await findByRole(element, "region", { name: "Latest run" });
    expect(result.textContent).toContain("Run succeeded");
    expect(result.textContent).toContain("Verification passed");
    expect(data.pending).toBe(0);
    expect(
      queryByRole(element, "region", { name: "Preview Clear pending" }),
    ).toBeNull();
  });

  it("requires accepting data loss before a destructive run", async () => {
    const { element, data } = mount({ destructive: true });
    await click(element, "Inspect");
    await findByRole(element, "region", { name: "Preview Clear pending" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(
      getByRole(element, "button", { name: "Confirm and run" }),
    ).toHaveProperty("disabled", true);

    getByRole(element, "checkbox", {
      name: /permanently deletes data/,
    }).click();

    await click(element, "Confirm and run");
    await findByText(element, "Run succeeded");
    expect(data.pending).toBe(0);

    // A new run needs a new inspection and a new acknowledgement.
    await click(element, "Inspect");

    const fresh = await findByRole(element, "region", {
      name: "Preview Clear pending",
    });

    expect(getByRole(fresh, "checkbox")).toHaveProperty("checked", false);
  });

  it("shows failure state honestly with rerun guidance", async () => {
    const { element, data } = mount({ retryPolicy: "manual_recovery" });
    data.fail = true;
    await click(element, "Inspect");
    await click(element, "Confirm and run");
    const result = await findByRole(element, "alert");
    expect(result.textContent).toContain("Run failed");
    expect(result.textContent).toContain("Error: storage unavailable");
    expect(result.textContent).toContain("Rerun is not supported");
  });

  it("keeps keyboard focus on the same control across re-renders", async () => {
    const { element } = mount();

    const inspect = await waitFor(() =>
      getByRole(element, "button", { name: "Inspect" }),
    );

    inspect.focus();
    await click(element, "Inspect");
    await findByRole(element, "region", { name: "Preview Clear pending" });
    await waitFor(() =>
      expect(document.activeElement?.getAttribute("data-focus-key")).toBe(
        "clear-pending:inspect",
      ),
    );
  });

  it("shows request errors and verification results", async () => {
    const { element, runner } = mount();
    await click(element, "Verify");
    expect(
      (await findByText(element, /Verification failed/)).textContent,
    ).toContain("3 remaining");

    await click(element, "Inspect");
    await findByRole(element, "region", { name: "Preview Clear pending" });
    await runner.inspect("clear-pending"); // another operator replaced the confirmation
    await click(element, "Confirm and run");
    expect((await findByRole(element, "alert")).textContent).toContain(
      "Inspect the job again",
    );
  });
});
