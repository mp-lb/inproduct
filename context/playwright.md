## Browser tests

The Playwright suite in `tests/docs/` checks the documentation website. Run it through `pnpm docs:test`, which uses the project's shared validation runner and `tests/docs/playwright.config.ts`. Follow validation's explicit browser-testing permission requirement; installing this block does not authorize a browser run.

The config allocates a local port, uses one worker and starts the docs server itself without reusing an existing server. `TEST_DOCS_URL` selects an already deployed target and disables that local server; `PLAYWRIGHT_CHANNEL` selects the browser channel. Use this configured lifecycle rather than starting a second web server or assuming an application-auth E2E stack.

Setup reference: `fm read extensions/playwright/README.md --store mp-lb/fssstack`.
