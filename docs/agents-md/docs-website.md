## Documentation

FSS Stack docs-site guidance, adapted to the current Tier 0 library and Fumadocs MDX 15 macro workflow.

- `docs/public/` is the only published content. Keep internal standards and runbooks outside it.
- The library currently has one utility: its emitted declarations and README are the API reference. Do not maintain a duplicate handwritten signature reference. If the API grows into Tier 1, add TypeDoc-to-Markdown generation and committed-reference drift checks per `docs/standards/libs.md`.
- `pnpm docs:gen` generates prerendered HTML, local search, per-page Markdown and `llms-full.txt` from the public MDX. Output lives in ignored `apps/docs/build/client`; never edit generated output.
- `pnpm docs:check` rebuilds from source and verifies pages, Markdown, search and the public-content boundary. The docs workflow runs it in CI. There is no committed generated API reference to drift-check at Tier 0.
- After public API or guide changes, update behavioral narrative where necessary and run `pnpm docs:check`. Types remain the source of truth.
- MDX collections use `fumadocs-mdx/macro` plus the Vite plugin. This version needs neither `source.config.ts`, a `fumadocs-mdx` postinstall codegen command, nor a generated `.source` import alias.
- Use `zap up docs` for development and `pnpm docs:gen` followed by `zap task docs-preview` to serve the static output. Both read Zap's `DOCS_PORT`; stop the docs dev service before starting preview on that port.

Read `docs/standards/libs.md` and `apps/docs/README.md` for the tier rules and version-specific recipe exceptions.
