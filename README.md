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
pnpm --filter @mp-lb/inproduct-frontend dev
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

The publishable backend utility is `@mp-lb/inproduct`; `apps/backend` is a private
health-service scaffold. Releases use Changesets and `.github/workflows/release.yaml`.
MyShop is excluded from publication and ordinary builds. Validate its bundle explicitly
with `zap task myshop-check`. Root checks share the local heavy-task queue.
