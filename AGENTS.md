<!-- Standard -->
## Agent context

Shared agent instructions live in `context/`. `context/index.md` explicitly imports blocks with `@filename.md`, in order. Files that are not imported are not included.

Edit source blocks, not generated root files. To add a block, create it and add its import to the index. To remove one, remove the import and unused file. Keep rules short and specific to the actual project.

Run `zap task context-build` after changes. Review and commit the source changes together with `AGENTS.base.md`, `AGENTS.md`, and `CLAUDE.md`. Without personal additions, all three outputs should match. Missing shared imports are errors, not optional omissions.

Keep private and machine-specific instructions out of committed context. The compiler supports explicit extra context paths for a local working copy; never commit those additions. `zap task context-copy` restores the root agent files from the shared base.

Extensions are documented at `extensions/<extension>/README.md` in the FSS Stack source (read with `fm read extensions/<extension>/README.md --store mp-lb/fssstack`). Each extension owns its context and other payloads. When installing one, copy its context payload, adapt it to the project, add the import once, and rebuild. Merge updates into existing customized blocks instead of overwriting them.
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
## Standards

FSS Stack ships with MAP Lab's public engineering standards. Read relevant standards on demand with `fm read <file>.md --store mp-lb/dev`; list them with `fm ls --store mp-lb/dev`. Public FSS Stack setup standards and extension payloads are also available in Stackforge's `fssstack/` tree, published as `mp-lb/fssstack`.

Keep code focused and well organized, reuse domain schemas and shared components, and prefer sentence case for product copy and documentation. Follow project-specific architecture and validation policies. Record documentation sources and any Forum sync mapping in the documentation block; these standards do not require a project-specific or private Forum store.
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
## Development

Use pnpm for dependencies and Zap for service orchestration. Run `zap status`, `zap up`, and `zap logs <service> --no-follow` to manage local services. Ports are allocated by Zap through zap.yaml; do not commit numeric local ports. Non-secret defaults live in .env.local; secrets belong in the ignored .env.

MyShop (`apps/myshop-frontend` and `apps/myshop-backend`) is private and local-only; never publish or deploy it. Run `zap task myshop` for the seeded demo and `zap task myshop-check` for its explicit local build. Ordinary builds exclude both MyShop apps. Uploaded files persist in ignored `apps/myshop-backend/.data/files`; reset only affects the catalog/cart. Root validations use `packages/scripts/runValidation.ts` and share the per-user heavy-task lock; do not nest wrapped commands or remove the lock.

Bootstrap dependencies with `zap t setup` before running TypeScript tasks. The validation runner uses the same persistent OS file lock as older checkouts, with a 2 GiB Node heap (4 GiB for lint) and one worker; setup installs dependencies directly so a fresh checkout does not require an already installed runner.
## Validation

Use `zap task check`, `zap task test`, `zap task build` for the applicable checks. For context-only changes, run `zap task context-build`, check required imports and review all three generated outputs. Preserve specialized testing and evaluation constraints in the project instructions.

Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` before handing off meaningful changes. Keep tRPC procedure integration tests alongside the router. Use Chrome for manual testing only when the user explicitly asks for it.
## Scripts

Write project scripts in TypeScript in the package that owns the behaviour, or `packages/scripts` when there is no natural owner, and include them in normal lint and typecheck checks. Expose each script as a thin Zap task that invokes it with `tsx` (for example, `zap t somemigration` runs `packages/scripts/somemigration.ts`); keep CI callers aligned when moving scripts.
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

Push `main` to deploy the services selected in `.arcnet/arcnet.yaml`; check the ArcNet workflow to confirm deployment.

Packages are selected by their `package.json`: use `private: true` for internal packages and `private: false` with `publishConfig.access: public` for packages intended for npm. The publisher scans immediate children of `packages/` and `apps/`; a missing `private` field also makes a package eligible. GitHub Packages uses its own registry configuration.

The npm workflow on pushes to `main` compares packed package contents with npm and publishes changed packages at the next patch version. ArcNet supplies the configured publishing credential through its `publish` secret consumer; the secret source must contain `NPM_TOKEN`. Check the workflow run to confirm publication. First publication may require an authenticated local publish, depending on npm credentials and trusted-publisher setup.
MyShop apps are private and local-only. Respect publication holds and the public documentation delivery checks below.

Local validation establishes readiness for integration, not production delivery. Before requesting production sign-off, the delivery owner must record the deployed revision and successful live checks of the intended public URL, guide content, navigation, search, and agent-readable output. Report uncompleted deployment or publication explicitly. Website deployment and npm publication are separate actions: respect any publication hold and inspect workflow triggers before pushing because a changed package build publishes automatically.

<!-- Project types -->
## Frontend

Use the UI framework and component library configured in the frontend package. For shadcn/ui frontends, add components from that package's directory with the shadcn CLI and reuse the existing utilities, preset and theme. Do not assume the frontend is named `apps/frontend`.

Keep components focused, reuse form schemas and existing loading/error patterns, and validate the affected frontend through its configured Zap tasks.

Frontend packages: `apps/myshop-frontend`, `apps/landing-page`. Run component installation in the relevant package.
## Backend

Keep application configuration at the app boundary and pass shared dependencies into packages. Reuse domain schemas rather than duplicating validation between API and UI. For tRPC backends, enforce authorization in procedures and test important behavior at the API boundary. Adapt this block to the selected backend and actual schema/package ownership.

Backend applications: `apps/myshop-backend`.
## Libraries and CLIs

Keep public package boundaries explicit. After changing a CLI, build it and verify the installed command resolves to the intended local build. Update and validate public API/command documentation when behavior changes. Use the project's actual build, link and documentation tasks; do not assume tasks that have not been configured.

<!-- Extensions -->
## ArcNet

This project uses ArcNet. `.arcnet/arcnet.yaml` records its configured sources, consumers and selected deployment services. Read that configuration and the delivery block before changing infrastructure. Minimal installations may only manage secrets/variables; do not assume an application is deployed.

Keep deployment build paths, runtime entrypoints, health settings and domains aligned with the actual applications. Local databases are not automatically deployment services. Verify the relevant workflow and runtime result after delivery.

Setup and updates: `fm read extensions/arcnet/README.md --store mp-lb/fssstack` and `fm read SETUP.md --store mp-lb/arcnet`.
## ArcNet secrets and variables

Read `.arcnet/arcnet.yaml` for the actual Forum sources and configured consumers. Source values live in those stores; encrypted snapshots under `.arcnet/secrets/` are committed. GitHub repository secrets contain CI decryption keys, not the plaintext source values.

After changing sources, run `arcnet secrets sync` or `arcnet variables sync` as appropriate and commit refreshed snapshots. Use `arcnet env check --password` for local validation and `arcnet env run --consumer <name> -- <command>` for a configured consumer. Keep plaintext, passwords and decryption keys out of context and Git.

These delivery sources are distinct from local `.env` secrets and `.env.local` non-secret defaults where the project uses those files.
## MongoDB

The storage library provides MongoDB adapters, with local database services for their tests. The MyShop demo remains local-only. Reuse its existing connection and collection/schema helpers. Application configuration supplies the connection URL and database name; shared packages should not independently load runtime environment files.

Use the MongoDB service and dynamic port configured in `zap.yaml` for local work. Maintenance/reset tasks are destructive: verify the resolved target is the intended disposable local database and follow the project's data policy before running them. Close clients during script/test cleanup.

Setup and updates: `fm read extensions/mongodb/README.md --store mp-lb/fssstack`.

Installed dependency owners: `packages/storage`. Consult their existing configuration and the matching `zap.yaml` services/tasks before changes.
## Object storage

The storage library provides an S3-compatible adapter. This does not imply a deployed S3 service for the MyShop demo. Reuse its existing storage client and bucket configuration. Consumers supply storage configuration; preserve the demo's existing disk adapter and local-only scope.

An explicit local endpoint requires path-style addressing. Bootstrap local buckets and browser CORS when needed. Localhost presigned URLs cannot be fetched by external services. Keep real credentials out of context and committed defaults.

Setup and updates: `fm read extensions/s3/README.md --store mp-lb/fssstack`.

Installed dependency owners: `packages/storage`. Consult their existing configuration and the matching `zap.yaml` services/tasks before changes.
## Browser tests

The Playwright suite in `tests/docs/` checks the documentation website. Run it through `pnpm docs:test`, which uses the project's shared validation runner and `tests/docs/playwright.config.ts`. Follow validation's explicit browser-testing permission requirement; installing this block does not authorize a browser run.

The config allocates a local port, uses one worker and starts the docs server itself without reusing an existing server. `TEST_DOCS_URL` selects an already deployed target and disables that local server; `PLAYWRIGHT_CHANNEL` selects the browser channel. Use this configured lifecycle rather than starting a second web server or assuming an application-auth E2E stack.

Setup reference: `fm read extensions/playwright/README.md --store mp-lb/fssstack`.
## Domains

Use the project's deployment configuration and runbook for its actual canonical hostnames and authoritative DNS/provider ownership. For ArcNet, service domains live in `.arcnet/arcnet.yaml`; do not assume historical Terraform files control the current deployment.

A domain change must account for application URLs, CORS, auth callbacks, redirects and external integrations. Verify provider mappings, DNS, TLS and application health before retiring a working hostname. Use provider-reported DNS targets, not copied account-specific values.

Setup and updates: `fm read extensions/custom-domains/README.md --store mp-lb/fssstack`.

Configured service domains: `inproduct.mp-lb.dev`, `docs.inproduct.mp-lb.dev`. Their service mapping is in `.arcnet/arcnet.yaml`.

<!-- MapLab augmentations -->
## MapLab workflow

Commit completed changes promptly, then use follow-up commits for fixes. Commit only your own changes; unrelated edits are normal and do not block work. Follow explicit project/user push preferences, and establish the preference once if unknown. Do not assume a push is harmless: it may trigger delivery.

Use Berth for project work and tasks; use `berth project list` and built-in help to locate the relevant project. Keep locally developed CLI tools built and linked after changing them. Run environment-dependent work through the project's Zap tasks.
## MapLab toolchain

Every project using the MapLab augmentation uses mise for local tool selection. Read Node from `.node-version`. For pnpm projects, read pnpm from `package.json#packageManager`; do not duplicate these pins in `mise.toml`. npm projects keep npm and use the version bundled with the selected Node unless they explicitly pin another version. Preserve existing project versions and package managers.

Run `mise trust` and `mise install` when setting up a checkout. Use an activated shell or `mise exec -- zap ...` so tasks inherit the selected tools. Zapper remains the task/process runner. Verify the resolved Node and package-manager versions against their canonical sources.

Prefer installed tools' built-in help and verify authentication when needed; do not assume every cloud service is authenticated. Keep local CLI commands linked to the intended local build through a version-independent PATH directory, so changing the selected Node version does not hide `zap` or `fm`.
