// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  DataJobsClient,
  DataJobSummary,
} from "@mp-lb/inproduct-data-jobs";
import { createFileStorage } from "@mp-lb/inproduct-storage";
import { afterEach, describe, expect, it } from "vitest";
import { MyShop } from "./MyShop";

afterEach(cleanup);

const job: DataJobSummary = {
  id: "remove-legacy-product-fields",
  title: "Remove legacy product fields",
  description: "Removes retired fields.",
  scope: "Archived products in myshop_demo.products",
  destructive: true,
  retryPolicy: "safe_to_rerun",
  rerunSupported: true,
  state: { status: "idle" },
};

describe("Data jobs admin section", () => {
  it("mounts the standard panel from Admin and unmounts it when leaving", async () => {
    const user = userEvent.setup();

    const dataJobs: DataJobsClient = {
      list: async () => [job],
      inspect: () => Promise.reject(new Error("not used")),
      run: () => Promise.reject(new Error("not used")),
      verify: () => Promise.reject(new Error("not used")),
    };

    render(<MyShop files={createFileStorage()} dataJobs={dataJobs} />);
    await user.click(screen.getByRole("button", { name: "Admin" }));
    await user.click(screen.getByRole("button", { name: "Data jobs" }));

    const card = await screen.findByRole("article", { name: job.title });
    expect(card.textContent).toContain(
      "Archived products in myshop_demo.products",
    );

    expect(card.textContent).toContain("Deletes dataYes");

    await user.click(screen.getByRole("button", { name: "Manage products" }));
    expect(screen.queryByRole("region", { name: "Data jobs" })).toBeNull();
  });

  it("shows a backend failure instead of an empty list", async () => {
    const user = userEvent.setup();

    const dataJobs: DataJobsClient = {
      list: () =>
        Promise.reject(new Error("Data jobs need the local MongoDB service.")),
      inspect: () => Promise.reject(new Error("not used")),
      run: () => Promise.reject(new Error("not used")),
      verify: () => Promise.reject(new Error("not used")),
    };

    render(<MyShop files={createFileStorage()} dataJobs={dataJobs} />);
    await user.click(screen.getByRole("button", { name: "Admin" }));
    await user.click(screen.getByRole("button", { name: "Data jobs" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "local MongoDB",
    );
  });
});
