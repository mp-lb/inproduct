## Development

Use pnpm for dependencies and Zap for service orchestration. Run `zap status`, `zap up`, and `zap logs <service> --no-follow` to manage local services. Ports are allocated by Zap through zap.yaml; do not commit numeric local ports. Non-secret defaults live in .env.local; secrets belong in the ignored .env.

Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` before handing off meaningful changes. Keep tRPC procedure integration tests alongside the router. Use Chrome for manual testing only when the user explicitly asks for it.

Read docs/standards/style-guide.md for code changes, docs/standards/errors.md for error handling, docs/standards/trpc.md for API work, and docs/standards/logging.md and event-schema.md for logging/events. Follow docs/standards/libs.md and lib-release.md for publishable library changes.

Central standards and examples sync from mp-lb/fssstack using doctrine.yaml. Read them with `dx read` or pull updates with `dx pull`.

Edit source context in agents-md/ and regenerate with `zap task context-build`. Commit agents-md/ and AGENTS.base.md. AGENTS.md and CLAUDE.md are generated, ignored local files. Use `zap task context-copy` after cloning.

Release the library with Changesets and the release workflow. The GitHub CLI is available for pushes and CI checks.

Docs live in `docs/public/` and are rendered by `apps/docs` (Fumadocs). No docs hosting is configured by this repository. MyShop (`apps/myshop`) is private and local-only; never publish or deploy it. Run `zap task myshop` for the seeded demo and `zap task myshop-check` for its explicit local build. Ordinary builds exclude MyShop. Root validations use `scripts/run_validation.py` and share the per-user heavy-task lock; do not nest wrapped commands or remove the lock.
