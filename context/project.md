# 👑 InProduct

A collection of tools to put in your product.

Read MANIFESTO.md for the product philosophy. Setup values live in fssstack.yaml.

## Packages

- apps/landing-page: `@mp-lb/inproduct-landing-page`, public React/Vite marketing site.
- apps/myshop-frontend: `@mp-lb/inproduct-myshop-frontend`, local-only React/Vite library demo.
- apps/myshop-backend: `@mp-lb/inproduct-myshop-backend`, local-only Node HTTP demo using the storage library handler and disk adapter.
- packages/storage: `@mp-lb/inproduct-storage`, object/file storage, memory and disk adapters, HTTP transport and headless React hooks.
- packages/inproduct: `@mp-lb/inproduct`, publishable library.
- packages/core, packages/server, packages/trpc: private shared schemas, server helpers, and API router.

MyShop demonstrates the public libraries through a real frontend/backend boundary. No extensions are enabled.

The storage library provides MongoDB and S3 adapters for consumers and local tests. MyShop remains local-only with its existing disk adapter; these adapters do not imply deployed database or object-storage services.

### Related tooling

Shared tooling is developed in sibling checkouts under `~/Work`: Zapper (`zapper`) runs tasks, Forum (`forum`) provides `fm`, Tools (`tools`) provides ArcNet, and Stackforge (`stackforge`) owns setup conventions. When a change belongs in an owned dependency, inspect and update that source repository as needed, follow its `AGENTS.md`, then rebuild/relink the CLI or update the consuming dependency. Verify the command resolves to the intended build.

## Project-specific operations

MyShop (`apps/myshop-frontend` and `apps/myshop-backend`) is private and local-only. Use `zap task myshop` and `zap task myshop-check`; uploads persist in ignored `apps/myshop-backend/.data/files`. Run `zap t setup` before TypeScript tasks. Root validation uses `packages/scripts/runValidation.ts` and a shared per-user lock; do not nest wrapped commands or remove the lock.

Published guides live in `docs/public/` and internal notes in `docs/internals/`; this project has no Forum sync. After public API or CLI changes, run `docs:gen` and commit generated references and agent bundles. New public packages need consumer guides linked through `meta.json` and the docs introduction; update `apps/docs/scripts/checkDocs.ts` and run `pnpm docs:check`.

Respect publication holds and verify the deployed revision and public documentation before production sign-off. Frontends are `apps/myshop-frontend` and `apps/landing-page`; installed shadcn components for the latter are in `apps/landing-page/src/components/ui`.

For meaningful changes run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`; keep tRPC procedure integration tests alongside the router. The docs Playwright suite runs with `pnpm docs:test` and requires explicit user permission for browser testing. Its configuration manages the local server and port; `TEST_DOCS_URL` selects a deployed target and `PLAYWRIGHT_CHANNEL` selects the browser. Use Chrome for manual testing only when explicitly requested.
