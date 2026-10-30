## Validation

Use `zap task check`, `zap task test`, `zap task build` for the applicable checks. For context-only changes, run `zap task context-build`, check required imports and review both generated outputs. Preserve specialized testing and evaluation constraints in the project instructions.

Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` before handing off meaningful changes. Keep tRPC procedure integration tests alongside the router. Use Chrome for manual testing only when the user explicitly asks for it.

## Browser tests

The Playwright suite in `tests/docs/` checks the documentation website. Run it through `pnpm docs:test`, which uses the project's shared validation runner and `tests/docs/playwright.config.ts`. Browser testing requires explicit user permission.

The config allocates a local port, uses one worker and starts the docs server itself without reusing an existing server. `TEST_DOCS_URL` selects an already deployed target and disables that local server; `PLAYWRIGHT_CHANNEL` selects the browser channel. Use this configured lifecycle rather than starting a second web server or assuming an application-auth E2E stack.

Setup reference: `fm read extensions/playwright/README.md --store mp-lb/fssstack`.
