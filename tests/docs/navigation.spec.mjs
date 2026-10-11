import { test, expect } from "@playwright/test";
import { setTimeout } from "node:timers/promises";
/* global window */

for (const delayedContent of [false, true]) {
  test(`delayed content: ${delayedContent}; prerendered docs hydrate and preserve the article through reload and history`, async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    if (delayedContent) {
      await page.route(/\/assets\/.*\.js$/, async (route) => {
        await setTimeout(150);
        await route.continue();
      });
    }

    await page.goto("/docs/myshop");
    await page.waitForFunction(
      () => window.__reactRouterDataRouter?.state.initialized,
    );

    await expect(page.locator("article h1")).toHaveText("MyShop local example");
    await page
      .getByRole("link", { name: "Backend integration", exact: true })
      .click();

    await expect(page.locator("article h1")).toHaveText("Backend integration");
    await page.reload();
    await expect(page.locator("article h1")).toHaveText("Backend integration");
    await page.waitForFunction(
      () => window.__reactRouterDataRouter?.state.initialized,
    );

    await page.goBack();
    await expect(page).toHaveURL(/\/docs\/myshop$/);
    await expect(page.locator("article h1")).toHaveText("MyShop local example");
    await expect(page.locator("article")).toContainText(
      "Four deterministic products",
    );

    await page.goForward();
    await expect(page.locator("article h1")).toHaveText("Backend integration");
    await expect(page.locator("article")).toContainText("createProduct");
    expect(errors).toEqual([]);
  });
}

for (const [path, title] of [
  ["/docs", "InProduct"],
  ["/docs/installation", "Installation"],
  ["/docs/backend", "Backend integration"],
  ["/docs/myshop", "MyShop local example"],
]) {
  test(`direct load and reload: ${path}`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(path);
    await page.waitForFunction(
      () => window.__reactRouterDataRouter?.state.initialized,
    );

    await expect(page.locator("article h1")).toHaveText(title);
    await page.reload();
    await page.waitForFunction(
      () => window.__reactRouterDataRouter?.state.initialized,
    );

    await expect(page.locator("article h1")).toHaveText(title);
    await page.getByRole("button", { name: "Search ⌘ K", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(errors).toEqual([]);
  });
}
