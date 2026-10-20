# 👑 InProduct

A collection of tools to put in your product.

Read MANIFESTO.md for the product philosophy. Setup values live in manifest.json5.

## Packages

- apps/landing-page: `@mp-lb/inproduct-landing-page`, public React/Vite marketing site.
- apps/myshop-frontend: `@mp-lb/inproduct-myshop-frontend`, local-only React/Vite library demo.
- apps/myshop-backend: `@mp-lb/inproduct-myshop-backend`, local-only Node HTTP demo using the storage library handler and disk adapter.
- packages/storage: `@mp-lb/inproduct-storage`, object/file storage, memory and disk adapters, HTTP transport and headless React hooks.
- packages/inproduct: `@mp-lb/inproduct`, publishable library.
- packages/core, packages/server, packages/trpc: private shared schemas, server helpers, and API router.

MyShop demonstrates the public libraries through a real frontend/backend boundary. No extensions are enabled.

# How we work

## AGENTS.md and CLAUDE.md

A few conventions about these instruction files themselves:

- **The source is `context/` building blocks; the agent files are compiled from them.** `context/index.md` composes project-specific `@<block>.md` imports and standalone Forum links for shared blocks. Edit the project blocks and index, not the generated files.
- **`CLAUDE.md` and `AGENTS.md` are generated and committed outputs.** The context task first resolves local imports with [`@mp-lb/mdcompile`](https://www.npmjs.com/package/@mp-lb/mdcompile), then pipes that Markdown through `fm compile --stdin` to expand Forum links. Regenerate both files with the project’s context task and commit them with their source changes.
- **The compiled agent file is small on purpose.** It carries the always-true essentials and *points* at the detailed `docs/standards/*` for the rest — read those on demand rather than expecting everything to be in context.

## Tools you can expect to be authenticated

A handful of CLI tools are installed and already authenticated on this machine — use them freely, no setup required.

- **GitHub CLI (`gh`)** — we don't use PRs, but use it to check Actions runs, read issues, inspect remote state.
- **Google Cloud CLI (`gcloud`)**
- **AWS CLI (`aws`)**
- **Zapper** — our process manager and task runner.
- **Doctrine** — our document sync system.

## Git

Some projects use git and some use Doctrine, so be aware of which kind you're in.

**Local-first.** Work happens locally. Branches isolate a piece of work before it merges to `main`. We **rarely push to GitHub — only to deploy**, from `main`, as a separate step. We never use PRs.

**Commit incrementally.** Commit changes straight away. For follow-up fixes, make a new commit, and commit only your own changes — not unrelated ones (other agents may be in the same repo).

**Messages.** No conventions — a short lowercase string. For a follow-up fix, prefix with `fix: `.

## Deployments

Many projects deploy via CI when you push `main`. To confirm a deploy landed, lean on `gh`: glance at how long recent runs took, then schedule a recheck on a fitting cadence rather than polling tightly. Specifics vary by project.

## Doctrine

Unlike GitHub there are no branches — there's always a single source of truth. **Sync before you edit:** the source lives in the cloud, so the local copy can be stale, and editing stale is how you get conflicts. Pull latest first. After syncing, we commit the synced files to git too, so they always live in the repo.

## Task running

Run migrations, tests, the dev server, checks and static analysis, and everything else as **zap tasks** — otherwise environment variables aren't picked up. Add an **npm script only** when CI also needs to run something (prefix those to mark them as CI scripts); the one other exception is super-basic things like the dev server or build, which often connect to Vercel. Two or three standard scripts is fine; four is suspicious — at least one is probably dangling.

## Builds

We run builds locally mainly to confirm they pass. For libraries and especially **CLIs**, we build to produce the artifact; for web servers and apps, mostly just to test that the build runs.

## CLIs

We always keep CLIs built, and make sure the local PATH command is linked to the locally built copy. Check this after making changes to a CLI.

## Working alongside other agents

You're rarely the only agent at work — multiple agents run in the same repo, often the same branch, at once.

- **A dirty tree is normal — it doesn't block you.** Do your own work; don't touch the files someone else is changing, and when you commit, stage only your own files. Only **stop** if your change genuinely collides with a file in flight. Unfamiliar edits are almost certainly another agent's — work around them.
- Coordinate work through the project’s current task tracker and explicit handoff instructions.

## Frontend patterns

Beyond the stack itself (shadcn/ui, Tailwind, tRPC — see the tech-stack and ui blocks), the patterns we lean on:

- The **typeahead** pattern — a command box plus a popover (shadcn popovers, menus, command components).
- **Components we standardize early:** standard modals (one standard-modal component owning scrollbars/footers/action buttons), modal layout (modals as a global layer), and layout components (layout primitives own all whitespace via flex gap; content components are "dumb" and carry no padding of their own).

We have lots of frontend **standards** — always read the ones relevant to what you're working on.

## Backend

The backend is just **tRPC**, few layers. tRPC and Zod handle serialization, so database queries can go directly in procedure handlers — fine for most projects; pull a query into a shared function only when it's used repeatedly.

**Standards to watch:** `errors.md` (throwing/handling exceptions across front and back), `event-schema.md` (anything log-shaped — we treat logs as events).

**Zod-centric schemas.** The same schema serves the database, the API, and frontend forms. Keep them in a central registry (usually the core package); group by domain and avoid duplication — if the same keys appear two or three times, make it its own schema others extend.


## Working locally

You are expected to check logs, check which services are running, update env vars on your own. All code should have hot reloading so you would not need to restart unless the changes are not hot-reloadable. The `.env.local` is for non-secrets. The regular `.env` is for secrets so leave that to the dev, just ask them to update secrets.


## Development

Use pnpm for dependencies and Zap for service orchestration. Run `zap status`, `zap up`, and `zap logs <service> --no-follow` to manage local services. Ports are allocated by Zap through zap.yaml; do not commit numeric local ports. Non-secret defaults live in .env.local; secrets belong in the ignored .env.

Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` before handing off meaningful changes. Keep tRPC procedure integration tests alongside the router. Use Chrome for manual testing only when the user explicitly asks for it.

Read docs/standards/style-guide.md for code changes, docs/standards/errors.md for error handling, docs/standards/trpc.md for API work, and docs/standards/logging.md and event-schema.md for logging/events. Follow docs/standards/libs.md and lib-release.md for publishable library changes.

Central standards and examples sync from mp-lb/fssstack using `.forum/sync.yaml`. Read them with `dx read` or pull updates with `dx pull`.

Project-specific context source lives in `context/`; shared blocks are Forum
file references from `mp-lb/fssstack/agents-md`. Regenerate with
`zap task context-build`. Commit the generated `AGENTS.md` and `CLAUDE.md`
alongside their source changes.

The release workflow publishes changed library builds on pushes to `main`. The GitHub CLI is available for pushes and CI checks.

Docs live in `docs/public/` and are rendered by `apps/docs` (Fumadocs). No docs hosting is configured by this repository. MyShop (`apps/myshop-frontend` and `apps/myshop-backend`) is private and local-only; never publish or deploy it. Run `zap task myshop` for the seeded demo and `zap task myshop-check` for its explicit local build. Ordinary builds exclude both MyShop apps. Uploaded files persist in ignored `apps/myshop-backend/.data/files`; reset only affects the catalog/cart. Root validations use `scripts/run_validation.py` and share the per-user heavy-task lock; do not nest wrapped commands or remove the lock.

### Public package documentation and delivery

Every new public package must have a discoverable consumer guide in `docs/public/`, linked from `meta.json` and the docs introduction. A package README alone is not website documentation: the docs loader only reads `docs/public/`. Explain installation availability, initialization, configuration, behavior, and limitations; keep declarations as the API reference. Extend `scripts/check-docs.mjs` to verify the guide's HTML, per-page Markdown, `llms-full.txt`, search entry, and navigation link, then run `pnpm docs:check` before handoff.

Local validation establishes readiness for integration, not production delivery. Before requesting production sign-off, the delivery owner must record the deployed revision and successful live checks of the intended public URL, guide content, navigation, search, and agent-readable output. Report uncompleted deployment or publication explicitly. Website deployment and npm publication are separate actions: respect any publication hold and inspect workflow triggers before pushing because a changed package build publishes automatically.

## Tech stack

This tech is core and should be used **religiously**:

- Zod
- shadcn/ui and utility functions
- shadcn/ui CLI
- Tailwind CSS
- tRPC
- tRPC's tanstack style hooks
- react-hook-form with zod resolver


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


## Process management

[Zapper](https://docs.zapper.mp-lb.dev) runs this project's processes (native and containerized) and one-off tasks from a single `zap.yaml`. Ports and env vars come from Zapper — never hardcode a dev port or fall back to a framework default. The project is often already running in the background.

A few basics:

```
zap status              # what's running
zap up                  # start everything
zap logs <service> --no-follow
zap restart <service>
zap task <task>         # run a one-off task
```

Beyond these, the CLI has full built-in help — run `zap --help`, or `zap <command> --help` for a specific command. If that's still not enough, the complete documentation is online at <https://docs.zapper.mp-lb.dev>.


## UI

The frontend uses [shadcn/ui](https://ui.shadcn.com/) for UI components. Add new components with `npx shadcn@latest add <component>` from the `apps/frontend` directory.

Always use shadcn/ui where possible, including utilities like `cn` for conditional classnames.


## Documentation layout

This project's docs live under `docs/` with a fixed layout — keep to it:

- **Root = project surface.** Only top-level, act-on-it files belong at the root
  of `docs/`: `README.md`, `STORY.md`, the task board (`*.board.json`), and any
  studies/positioning you want at eye level. Don't drop loose docs here.
- **`docs/internals/` = this project's own docs.** Every system/engineering doc —
  feature docs, architecture notes, setup runbooks, how-things-work explainers —
  lives here. When you write a doc about how something works, it goes in
  `docs/internals/`, never loose at the root.
- **`docs/standards/`, `docs/extensions/`, `docs/examples/`, `docs/skills/` =
  Fssstack store references.** Shared content composed in via the project's
  Doctrine store. Read-through; don't fork or edit casually.
- **`docs/public/`** *(libraries only)* — the opt-in published surface the docs
  site renders (see `standards/libs.md`). Everything else in `docs/` is
  unpublished by default.

The compiled `CLAUDE.md`/`AGENTS.md` stays deliberately small — it carries the
always-true essentials and *points* at `docs/standards/*` for the detail. Read
those on demand rather than expecting everything to be in context.


## Doctrine

Central docs are stored in the cloud using doctrine. You can run commands like `pnpm exec fm read some-file.md` and `pnpm exec fm ls`. Relative file paths are likely to be real files on disk.


## Documentation

This project publishes docs, so they're **generated from the source of truth**, not hand-maintained in parallel — they can't drift:

- A library's API reference comes from its **types**; a CLI's command reference comes from its **commander tree**. You don't hand-write these.
- **After changing public API or CLI commands/flags, run `docs:gen`** to regenerate the reference (and the `llms-full.txt` agent bundle), then commit the result.
- **`docs:check` runs in CI and fails if the committed docs are stale** — regenerating is not optional.
- Hand-written narrative (README, guides) lives beside the generated reference: update it when behaviour changes, but never restate signatures or flags — link to the reference instead.

Read `docs/standards/libs.md` for the full model (and `docs/standards/clis.md` if the package ships a `bin`).
