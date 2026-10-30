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
- apps/myshop-backend: `@mp-lb/inproduct-myshop-backend`, local-only Node HTTP demo using the storage library handler and disk adapter.
- packages/storage: `@mp-lb/inproduct-storage`, object/file storage, memory and disk adapters, HTTP transport and headless React hooks.
- packages/inproduct: `@mp-lb/inproduct`, publishable library.
- packages/core, packages/server, packages/trpc: private shared schemas, server helpers, and API router.

MyShop demonstrates the public libraries through a real frontend/backend boundary. No extensions are enabled.

The storage library provides MongoDB and S3 adapters for consumers and local tests. MyShop remains local-only with its existing disk adapter; these adapters do not imply deployed database or object-storage services.

### Related tooling

Shared tooling is developed in sibling checkouts under `~/Work`: Zapper (`zapper`) runs tasks, Forum (`forum`) provides `fm`, Tools (`tools`) provides ArcNet, and Stackforge (`stackforge`) owns setup conventions. When a change belongs in an owned dependency, inspect and update that source repository as needed, follow its `AGENTS.md`, then rebuild/relink the CLI or update the consuming dependency. Verify the command resolves to the intended build.

## Standards

Read the relevant MAP Lab standards before changing the corresponding code. List them with `fm ls --store mp-lb/dev` and read one with `fm read <file>.md --store mp-lb/dev`.

- `style-guide.md` and `component-decomposition.md`: code and component structure.
- `crud.md`, `errors.md`, `trpc.md` and `logging.md`: backend APIs, services and error handling; list the store for current available guidance.
- `event-schema.md` and `event-sourcing.md`: event schemas and event-sourced domains.
- `libs.md`, `lib-release.md` and `clis.md`: libraries, publishing and command-line tools.
- `context-files.md`: maintaining agent context.


## Development

Use pnpm for dependencies and Zap for service orchestration. Run `zap status`, `zap up`, and `zap logs <service> --no-follow` to manage local services. Ports are allocated by Zap through zap.yaml; do not commit numeric local ports. Non-secret defaults live in .env.local; secrets belong in the ignored .env.

MyShop (`apps/myshop-frontend` and `apps/myshop-backend`) is private and local-only; never publish or deploy it. Run `zap task myshop` for the seeded demo and `zap task myshop-check` for its explicit local build. Ordinary builds exclude both MyShop apps. Uploaded files persist in ignored `apps/myshop-backend/.data/files`; reset only affects the catalog/cart. Root validations use `packages/scripts/runValidation.ts` and share the per-user heavy-task lock; do not nest wrapped commands or remove the lock.

Bootstrap dependencies with `zap t setup` before running TypeScript tasks. The validation runner uses the same persistent OS file lock as older checkouts, with a 2 GiB Node heap (4 GiB for lint) and one worker; setup installs dependencies directly so a fresh checkout does not require an already installed runner.

### Local tool versions

Mise is the base layer: it selects Node and the package manager. Zapper runs tasks and services on top of those tools. Run `mise trust` and `mise install` for checkout setup, then use an activated mise shell or `mise exec -- zap task <task>`.

Read Node from `.node-version` and pnpm from `package.json#packageManager`; `mise.toml` reads these pins rather than duplicating them. npm projects use npm bundled with Node. Preserve the project's versions and package manager. Keep locally built CLI entrypoints in a version-independent PATH directory so switching Node does not hide `zap` or `fm`.
## Validation

Use `zap task check`, `zap task test`, `zap task build` for the applicable checks. For context-only changes, run `zap task context-build`, check required imports and review both generated outputs. Preserve specialized testing and evaluation constraints in the project instructions.

Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` before handing off meaningful changes. Keep tRPC procedure integration tests alongside the router. Use Chrome for manual testing only when the user explicitly asks for it.

## Browser tests

The Playwright suite in `tests/docs/` checks the documentation website. Run it through `pnpm docs:test`, which uses the project's shared validation runner and `tests/docs/playwright.config.ts`. Browser testing requires explicit user permission.

The config allocates a local port, uses one worker and starts the docs server itself without reusing an existing server. `TEST_DOCS_URL` selects an already deployed target and disables that local server; `PLAYWRIGHT_CHANNEL` selects the browser channel. Use this configured lifecycle rather than starting a second web server or assuming an application-auth E2E stack.

Setup reference: `fm read extensions/playwright/README.md --store mp-lb/fssstack`.

## Scripts

Write project scripts in TypeScript in the package that owns the behaviour, or `packages/scripts` when there is no natural owner, and include them in normal lint and typecheck checks. Expose each script as a thin Zap task that invokes it with `tsx` (for example, `zap t somemigration` runs `packages/scripts/somemigration.ts`); keep CI callers aligned when moving scripts.



## Documentation

Keep project-specific documentation in `docs/` and update it with behavior changes. Follow the project's own instructions for any Forum sync mapping; read shared standards and extension setup from their Forum stores.


## Documentation

Keep InProduct-specific documentation in `docs/`. `docs/public/` contains the published library guides and `docs/internals/` contains internal engineering notes. Root-level project documents such as `README.md` and `MANIFESTO.md` stay at the repository root. Shared standards and extensions belong in Forum.

This project publishes docs generated from the source of truth. A library's API reference comes from its types, and a CLI's command reference comes from its command tree. After changing a public API or CLI command, run `docs:gen` and commit the generated reference and agent bundle. CI runs `docs:check` to catch stale output. Keep hand-written guides beside generated references and link to signatures rather than repeating them.

Read `libs.md` from `mp-lb/dev` for the full model (`fm read libs.md --store mp-lb/dev`). For packages with a CLI, also read `clis.md` from that store.

Read shared standards with `fm read <file>.md --store mp-lb/dev` (list them with `fm ls --store mp-lb/dev`). Read shared extensions with `fm read extensions/<extension>/README.md --store mp-lb/fssstack` (list them with `fm ls extensions --store mp-lb/fssstack`).

Relevant standards include `style-guide.md` for code changes, `errors.md` for error handling, `trpc.md` for API work, `logging.md` and `event-schema.md` for events, and `libs.md` and `lib-release.md` for publishable libraries.

InProduct has no dedicated Forum store or `.forum/` sync configuration.

Every new public package must have a discoverable consumer guide in `docs/public/`, linked from `meta.json` and the docs introduction. A package README alone is not website documentation: the docs loader only reads `docs/public/`. Explain installation availability, initialization, configuration, behavior, and limitations; keep declarations as the API reference. Extend `apps/docs/scripts/checkDocs.ts` to verify the guide's HTML, per-page Markdown, `llms-full.txt`, search entry, and navigation link, then run `pnpm docs:check` before handoff.

`apps/docs` renders `docs/public/` with Fumadocs. No docs hosting is configured by this repository.
## Delivery

Push `main` to deploy configured services and publish eligible npm packages; check the GitHub Actions runs. Respect publication holds, and verify the deployed revision and public documentation before production sign-off; MyShop is local-only.

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


## Project UI

Frontend packages: `apps/myshop-frontend`, `apps/landing-page`. Run component installation in the relevant package.

Installed shadcn component locations: `apps/landing-page/src/components/ui` (configuration: `apps/landing-page/components.json`, theme: `apps/landing-page/src/index.css`).

<!-- Extensions -->

## ArcNet

This project uses ArcNet. `.arcnet/arcnet.yaml` records its configured sources, consumers and selected deployment services. Read that configuration and the project’s delivery instructions before changing infrastructure. Minimal installations may only manage secrets/variables; do not assume an application is deployed.

Keep deployment build paths, runtime entrypoints, health settings and domains aligned with the actual applications. Local databases are not automatically deployment services. Verify the relevant workflow and runtime result after delivery.

Setup and updates: `fm read extensions/arcnet/README.md --store mp-lb/fssstack` and `fm read SETUP.md --store mp-lb/arcnet`.

## ArcNet secrets and variables

Read `.arcnet/arcnet.yaml` for the actual Forum sources and configured consumers. Source values live in those stores; encrypted snapshots under `.arcnet/secrets/` are committed. GitHub repository secrets contain CI decryption keys, not the plaintext source values.

After changing sources, run `arcnet secrets sync` or `arcnet variables sync` as appropriate and commit refreshed snapshots. Use `arcnet env check --password` for local validation and `arcnet env run --consumer <name> -- <command>` for a configured consumer. Keep plaintext, passwords and decryption keys out of context and Git.

These delivery sources are distinct from local `.env` secrets and `.env.local` non-secret defaults where the project uses those files.
