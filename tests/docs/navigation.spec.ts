import { test, expect } from "@playwright/test";
import { setTimeout } from "node:timers/promises";
/* global window */

for (const delayedContent of [false, true]) {
  test(`delayed content: ${delayedContent}; prerendered docs hydrate and preserve the article through reload and history`, async ({
    page,
  }) => {
    const errors: string[] = [];
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
    const errors: string[] = [];
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
    await page.getByRole("button", { name: /^Search\b/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("Back before reload hydration uses the destination article", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/docs/myshop");
  await page.waitForFunction(
    () => window.__reactRouterDataRouter?.state.initialized,
  );

  await page.getByRole("button", { name: /^Search\b/ }).click();
  await page.getByRole("dialog").press("Escape");
  await page
    .getByRole("link", { name: "Backend integration", exact: true })
    .click();

  await expect(page.locator("article h1")).toHaveText("Backend integration");

  let releaseEntry!: () => void;

  const entryReady = new Promise<void>((resolve) => {
    releaseEntry = resolve;
  });

  await page.route(/\/assets\/entry\.client-.*\.js$/, async (route) => {
    await entryReady;
    await route.continue();
  });

  await page.reload({ waitUntil: "commit" });
  await expect(page.locator("article h1")).toHaveText("Backend integration");
  await page.goBack({ waitUntil: "commit" });
  releaseEntry();
  await expect(page).toHaveURL(/\/docs\/myshop$/);
  await expect(page.locator("article h1")).toHaveText("MyShop local example");
  await page.getByRole("button", { name: /^Search\b/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(errors).toEqual([]);
});

test("unknown paths retain the SPA 404 fallback without reloading", async ({
  page,
}) => {
  let documentRequests = 0;
  page.on("request", (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame())
      documentRequests++;
  });

  await page.goto("/unknown-page");
  await page.waitForFunction(
    () => window.__reactRouterDataRouter?.state.initialized,
  );

  await expect(page.getByRole("heading", { name: /not found/i })).toBeVisible();
  expect(documentRequests).toBe(1);
});
