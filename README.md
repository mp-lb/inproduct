# 👑 InProduct

A collection of tools to put in your product.

This repository is an FSS Stack project. It is a pnpm workspace with applications in `apps/`, shared packages in `packages/`, and project documentation in `docs/`.

## Prerequisites

- Node.js 22.13 or newer
- pnpm 11
- Zapper (`zap`) for local service orchestration

## Install

Install workspace dependencies from the repository root:

```bash
pnpm install
```

If the project uses private packages or external services, make sure the required secrets are available in `.env`. Non-secret local defaults live in `.env.local`.

## Run Locally

Start the local services with Zapper:

```bash
zap up
```

Open the configured homepage:

```bash
zap o
```

Run a single package or app directly with pnpm filters when you need to work outside the full service set:

```bash
pnpm --filter @mp-lb/inproduct-landing-page dev
```

## Validate

Use the same checks before handing off work:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The Zapper task wrapper also runs the standard lint and typecheck flow:

```bash
zap task check
```

## Workspace

- `apps/` contains runnable services and frontend applications.
- `packages/` contains shared libraries, server helpers, API contracts, and publishable packages.
- `etc/` contains shared TypeScript, Vitest, and tooling configuration.
- `docs/` contains project standards, release notes, and implementation guidance.
- `zap.yaml` defines local services, ports, and common development tasks.

## Development Notes

- Keep non-secret local configuration in `.env.local`.
- Keep secrets in `.env`; do not commit them.
- Use workspace package names with `pnpm --filter` for focused commands.
- Check service logs and port assignments through Zapper while debugging local runs.
- Update the docs in `docs/` when changing project conventions or release behavior.

## Documentation and local shop

`zap up docs` starts the Fumadocs site. `zap task myshop` builds the library and starts
the private, local-only shop. Use `zap status` for their allocated loopback URLs.
See [the MyShop guide](docs/public/myshop.mdx) for seed data, reset behavior and the
local-only boundary. Public documentation is opt-in under `docs/public/`.

`apps/landing-page` is the marketing site. `apps/myshop-frontend` and
`apps/myshop-backend` form the private local demo. The backend imports the public
storage library, mounts its HTTP handler, and persists files with its disk adapter. Releases run through `.github/workflows/release.yaml`.
The release workflow loads the standard and project encrypted snapshots from `.arcnet/`,
selects only the npm publishing token through `arcnet env run`, and publishes packages
on each push to `main` when a public package build changes.
MyShop is excluded from publication and ordinary builds. Validate its bundle explicitly
with `zap task myshop-check`. Root checks share the local heavy-task queue.

The object-storage module is [`@mp-lb/inproduct-storage`](packages/storage/README.md),
with object/file operations, memory and disk adapters, a Node HTTP handler, a browser
client and headless React hooks. File uploads survive reloads and backend restarts;
the catalog/cart remain tab-local.
