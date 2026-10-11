// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { MyShop } from "./MyShop";

afterEach(cleanup);
describe("MyShop interaction", () => {
  it("updates cart quantities and resets all local state", async () => {
    const user = userEvent.setup();
    render(<MyShop />);
    await user.click(
      screen.getAllByRole("button", { name: "Add to cart" })[0]!,
    );

    const cart = within(screen.getByRole("complementary"));
    expect(cart.getAllByText("$18.00")).toHaveLength(2);
    await user.click(
      cart.getByRole("button", { name: "Increase Everyday mug" }),
    );

    expect(cart.getAllByText("$36.00")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Reset demo" }));
    expect(cart.getByText("$0.00")).toBeTruthy();
  });

  it("creates, edits and deletes a product and reconciles the cart", async () => {
    const user = userEvent.setup();
    render(<MyShop />);
    await user.click(screen.getByRole("button", { name: "Manage products" }));
    await user.click(screen.getByRole("button", { name: "Add product" }));
    await user.type(screen.getByLabelText("Name"), "Summer Bag!");
    await user.type(screen.getByLabelText("Price (USD)"), "25");
    expect(screen.getByText("summer-bag")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Save product" }));
    await user.click(screen.getByRole("button", { name: "Storefront" }));

    const product = screen
      .getByRole("heading", { name: "Summer Bag!" })
      .closest("article")!;

    await user.click(
      within(product).getByRole("button", { name: "Add to cart" }),
    );

    await user.click(screen.getByRole("button", { name: "Manage products" }));

    const row = screen
      .getByRole("heading", { name: "Summer Bag!" })
      .closest("article")!;

    await user.click(within(row).getByRole("button", { name: "Edit" }));
    await user.clear(screen.getByLabelText("Price (USD)"));
    await user.type(screen.getByLabelText("Price (USD)"), "30");
    await user.click(screen.getByRole("button", { name: "Save product" }));
    await user.click(screen.getByRole("button", { name: "Storefront" }));
    expect(
      within(screen.getByRole("complementary")).getAllByText("$30.00"),
    ).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Manage products" }));
    await user.click(
      within(
        screen
          .getByRole("heading", { name: "Summer Bag!" })
          .closest("article")!,
      ).getByRole("button", { name: "Delete" }),
    );

    await user.click(screen.getByRole("button", { name: "Storefront" }));
    expect(
      within(screen.getByRole("complementary")).getByText("$0.00"),
    ).toBeTruthy();

    expect(screen.queryByRole("heading", { name: "Summer Bag!" })).toBeNull();
  });
});
