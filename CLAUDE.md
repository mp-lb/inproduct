<!-- Standard -->

## Agent context

Agent instructions are compiled from reusable blocks in `context/`, with `context/index.md` listing the blocks in order. This keeps shared and project-specific instructions easy to maintain.

Edit the blocks and index in `context/`, then run `zap task context-build` to regenerate `AGENTS.md` and `CLAUDE.md`.


## Code style

- Use PascalCase for components
- Files should have 1 export, and should be named the same. E.g. MyComponent lives in MyComponent.tsx
- Use camelCase for constants, functions, mongo collections
- Use train_case for typed strings
- File routers are an exception
- Generally 1 function/class per file

### Functional decomposition

Good functional decomposition is essential. This applies to react components, hooks, backend functions. Continuously abstract and centralise important code. Functions should be small and "do one thing".

### Code organization

Maintain an extreme approach to code organization. Functions/components should never be large or complex. Generally every function should have it's own file. Those files should be well organised. Continuously break down programs and organise files so that it's always crystal clear what modules relate to each other. You have permission to do this at all times. Flag concerns with the developer if unsure.

Take extra care when organizing tests.

### Tech debt

In general, follow the boy scout principle. But if you come across tech debt that's too big to address, add a .md doc to docs/tech-debt and raise it with the user.


# 👑 InProduct

A collection of tools to put in your product.

Read MANIFESTO.md for the product philosophy. Setup values live in fssstack.yaml.

## Packages

- apps/landing-page: `@mp-lb/inproduct-landing-page`, public React/Vite marketing site.
- apps/myshop-frontend: `@mp-lb/inproduct-myshop-frontend`, local-only React/Vite library demo.
- apps/myshop-backend: `@mp-lb/inproduct-myshop-backend`, local-only Node HTTP demo using the storage library handler and disk adapter, plus a data-jobs tRPC router.
- packages/storage: `@mp-lb/inproduct-storage`, object/file storage, memory and disk adapters, HTTP transport and headless React hooks.
- packages/data-jobs: `@mp-lb/inproduct-data-jobs`, MongoDB data jobs (Remove fields built in) with a shared runner, framework-free panel, tRPC client adapter and CLI.
- packages/inproduct: `@mp-lb/inproduct`, publishable library.
- packages/core, packages/server, packages/trpc: private shared schemas, server helpers, and API router.

MyShop demonstrates the public libraries through a real frontend/backend boundary. No extensions are enabled.

The storage library provides MongoDB and S3 adapters for consumers and local tests. MyShop remains local-only with its existing disk adapter; these adapters do not imply deployed database or object-storage services.

### Related tooling

Shared tooling is developed in sibling checkouts under `~/Work`: Zapper (`zapper`) runs tasks, Forum (`forum`) provides `fm`, Tools (`tools`) provides ArcNet, and Stackforge (`stackforge`) owns setup conventions. When a change belongs in an owned dependency, inspect and update that source repository as needed, follow its `AGENTS.md`, then rebuild/relink the CLI or update the consuming dependency. Verify the command resolves to the intended build.

## Project-specific operations

MyShop (`apps/myshop-frontend` and `apps/myshop-backend`) is private and local-only. Use `zap task myshop` and `zap task myshop-check`; uploads persist in ignored `apps/myshop-backend/.data/files`. MyShop data jobs need `zap up mongodb`, use the disposable `myshop_demo` database and run from `zap task myshop-data-jobs`; `zap task data-jobs-test` runs the MongoDB-backed data-jobs tests. Run `zap t setup` before TypeScript tasks. Root validation uses `packages/scripts/runValidation.ts` and a shared per-user lock; do not nest wrapped commands or remove the lock.

Published guides live in `docs/public/` and internal notes in `docs/internals/`; this project has no Forum sync. After public API or CLI changes, run `docs:gen` and commit generated references and agent bundles. New public packages need consumer guides linked through `meta.json` and the docs introduction; update `apps/docs/scripts/checkDocs.ts` and run `pnpm docs:check`.

Respect publication holds and verify the deployed revision and public documentation before production sign-off. Frontends are `apps/myshop-frontend` and `apps/landing-page`; installed shadcn components for the latter are in `apps/landing-page/src/components/ui`.

For meaningful changes run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`; keep tRPC procedure integration tests alongside the router. The docs Playwright suite runs with `pnpm docs:test` and requires explicit user permission for browser testing. Its configuration manages the local server and port; `TEST_DOCS_URL` selects a deployed target and `PLAYWRIGHT_CHANNEL` selects the browser. Use Chrome for manual testing only when explicitly requested.

## Standards

Read the relevant MAP Lab standards before changing the corresponding code. List them with `fm ls --store mp-lb/dev` and read one with `fm read <file>.md --store mp-lb/dev`.

- `style-guide.md` and `component-decomposition.md`: code and component structure.
- `crud.md`, `errors.md`, `trpc.md` and `logging.md`: backend APIs, services and error handling; list the store for current available guidance.
- `event-schema.md` and `event-sourcing.md`: event schemas and event-sourced domains.
- `libs.md`, `lib-release.md` and `clis.md`: libraries, publishing and command-line tools.
- For agent context, read `standards/context-files.md` from `mp-lb/fssstack`.


## Development

Use Zapper for processes and tasks: `zap status`, `zap up`, `zap logs <service> --no-follow`, and `zap task <task>`. Inspect the existing stack before starting another copy. Services and tasks that need environment variables must receive Zapper's resolved environment.

Keep service names, dynamic ports and task commands in `zap.yaml`; do not hardcode development ports. Non-secret defaults live in `.env.local`; secrets belong in ignored `.env` or the configured secret source. Never put secret values in context.

The canonical tool versions are `.node-version` and `package.json#packageManager`; preserve them when changing local tooling or CI.

### Local tool versions

Mise is the base layer: it selects Node and the package manager. Zapper runs tasks and services on top of those tools. Run `mise trust` and `mise install` for checkout setup, then use an activated mise shell or `mise exec -- zap task <task>`.

Read Node from `.node-version` and pnpm from `package.json#packageManager`; `mise.toml` reads these pins rather than duplicating them. npm projects use npm bundled with Node. Preserve the project's versions and package manager. Keep locally built CLI entrypoints in a version-independent PATH directory so switching Node does not hide `zap` or `fm`.


## Validation

Run the applicable configured checks, tests and builds; use `zap task check`, `zap task test` and `zap task build` where available. Run focused checks and follow project-specific validation instructions; report checks that could not run.


## Scripts

Write project scripts in TypeScript in the package that owns the behaviour, or `packages/scripts` when there is no natural owner, and include them in normal lint and typecheck checks. Expose each script as a thin Zap task that invokes it with `tsx` (for example, `zap t somemigration` runs `packages/scripts/somemigration.ts`); keep CI callers aligned when moving scripts.


## Documentation

Keep project-specific documentation in `docs/` and update it with behavior changes. Follow the project's own instructions for any Forum sync mapping; read shared standards and extension setup from their Forum stores.


## Delivery

Push `main` to run the configured delivery workflows for applications and packages. Check GitHub Actions and follow any project-specific release exceptions.


<!-- Project types -->

## Frontend

Use shadcn/ui consistently for supported UI patterns. Reuse installed components before creating anything new; when a suitable component is missing, install it through the CLI rather than hand-building a substitute. Use the existing `cn` utility for conditional classes.

Run these commands from the frontend package containing `components.json`:

```sh
pnpm dlx shadcn@latest list @shadcn
pnpm dlx shadcn@latest search @shadcn -q dialog
pnpm dlx shadcn@latest add dialog
```

`components.json` defines component aliases and the theme CSS location; resolve its `aliases.ui` through the app's TypeScript aliases to find installed components. Review existing files before installation and preserve local customizations; do not blindly use `--overwrite`.

Use the shared theme tokens and existing component variants for colors, typography, spacing and radii. UI consistency takes priority over making one screen look different. Do not override theme-owned styles in individual components without a concrete reason; make intentional design-system changes at the shared theme or component level.

MAP Lab's public Shad repository provides additional components at `https://shad.mp-lb.dev`. Consult its catalog before building an equivalent, for example:

```sh
pnpm dlx shadcn@latest add https://shad.mp-lb.dev/r/ui-states.json
```

CLI reference: https://ui.shadcn.com/docs/cli.


<!-- Extensions -->

## ArcNet

This project uses ArcNet. `.arcnet/arcnet.yaml` records its configured sources, consumers and selected deployment services. Read that configuration and the project’s delivery instructions before changing infrastructure. Minimal installations may only manage secrets/variables; do not assume an application is deployed.

Keep deployment build paths, runtime entrypoints, health settings and domains aligned with the actual applications. Local databases are not automatically deployment services. Verify the relevant workflow and runtime result after delivery.

Setup and updates: `fm read extensions/arcnet/README.md --store mp-lb/fssstack` and `fm read SETUP.md --store mp-lb/arcnet`.

## ArcNet secrets and variables

Read `.arcnet/arcnet.yaml` for the actual Forum sources and configured consumers. Source values live in those stores; encrypted snapshots under `.arcnet/secrets/` are committed. GitHub repository secrets contain CI decryption keys, not the plaintext source values.

After changing sources, run `arcnet secrets sync` or `arcnet variables sync` as appropriate and commit refreshed snapshots. Use `arcnet env check --password` for local validation and `arcnet env run --consumer <name> -- <command>` for a configured consumer. Keep plaintext, passwords and decryption keys out of context and Git.

These delivery sources are distinct from local `.env` secrets and `.env.local` non-secret defaults where the project uses those files.
