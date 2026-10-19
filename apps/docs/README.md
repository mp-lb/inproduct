# InProduct docs

Fumadocs React Router SPA generated with `create-fumadocs-app@16.2.18`, aligned with
FSS Stack's `SETUP_PROCESS.md` Docs Sites recipe. The FSS Stack augmentation script
was applied; the version-dependent exceptions below were then retained deliberately.

## Run and verify

From the repository root:

```sh
zap task setup
zap task context-build
zap up docs
zap logs docs --no-follow
```

Zap allocates `DOCS_PORT`; dev and static-start scripts consume it and bind to loopback.
There is no numeric port fallback, following this repository's port policy. Zap enables
polling for docs file watching to avoid macOS watcher limits on shared hosts.

To inspect the deployable static output locally:

```sh
pnpm docs:gen
zap down docs
zap task docs-preview
```

Stop the foreground preview with Ctrl-C. `serve` serves `build/client`, including the
React Router SPA fallback via a generated `404.html`. The start command uses `--config ../../serve.json`
because serve 14 resolves that path relative to `build/client`, not the package directory. The recipe's catch-all rewrite shadows prerendered pages and the extensionless search endpoint in
serve 14, so `serve.json` instead uses clean URLs and disables directory listings. A build
step copies `__spa-fallback.html` to `404.html`, preserving real pages/resources and serving
the SPA shell with an appropriate 404 status for unknown paths. No server-side runtime is required for hosting.
`pnpm docs:check` rebuilds and verifies HTML, raw Markdown, local search and content boundaries;
the docs CI workflow runs this check.

## Recipe alignment

- Scoped private package, Zap service/port, cleaned-up scaffold samples.
- `tsconfig.json` extends `etc/tsconfig.frontend.json`, which extends the published
  `@mp-lb/fssstack-config/tsconfig/frontend.json`.
- All direct dependencies are pinned to the exact already-tested resolved versions;
  the lockfile is committed. `serve@14.2.6` supplies the recipe's static start command.
- Public content comes only from `docs/public/`; HTML, Orama local search and raw Markdown
  are prerendered into `apps/docs/build/client`.
- Conditional documentation guidance comes from the shared FSSstack
  `agents-md/docs-website.md` Forum file, included by this repository's
  `context/index.md` compiler entry.

## Version-dependent exceptions

The current official template has a dedicated `react-router-spa` variant. It was generated
with `--yes --no-git --pm pnpm` into `apps/docs`, which works in CLI 16.2.18 without the older
recipe's interactive workaround. We keep its SPA configuration and prerender every public page.

Fumadocs MDX 15.4.7 uses `defineDocs` from `fumadocs-mdx/macro` and `fumadocsMdx()` in Vite.
The [official Macro API](https://www.fumadocs.dev/docs/mdx/macro) explicitly needs no codegen
or `source.config.ts`; see also [Vite integration](https://www.fumadocs.dev/docs/mdx/vite).
Consequently there is no `fumadocs-mdx` postinstall or typecheck CLI invocation and no
`collections/*` generated-source alias. Typechecking uses React Router typegen plus TypeScript.

The library remains Tier 0 under `docs/standards/libs.md`: one utility, declarations and README.
A separate TypeDoc reference would duplicate a trivially navigable API. `docs:gen` builds the
site/agent bundle and `docs:check` validates fresh output; a committed-reference drift check
becomes applicable when a generated Tier 1 reference is introduced.

The standards mention `@mp-lb/docs-site`, but npm returned 404 for that preset at setup time.
The setup recipe explicitly treats house-theme augmentation as a separate flow; this site
retains the official Fumadocs theme.

## Hosting boundary

This repository does not configure docs deployment. Build the static docs with
`pnpm docs:gen` and preview them with `zap task docs-preview`.
`apps/docs/vercel.json` retains static routing/build settings for any future
hosting setup; it does not deploy the site.

The landing’s optional Docs link uses `VITE_DOCS_URL`. Hosting and DNS must be
verified separately before treating any configured URL as live.
MyShop is private and local-only and must never be included in a public deployment.

## Navigation regression checks

The short MDX guides are bundled eagerly, so the initial article and table of
contents hydrate synchronously. This avoids suspending the article on a separate
content download while browser history is changing. Revisit lazy loading only with
explicit hydration/preload handling if the collection grows.

After `pnpm docs:check`, run `pnpm docs:test`. The test uses installed Chrome locally,
allocates an ephemeral loopback port, and serves the actual static output. CI installs
Playwright Chromium and selects it with `PLAYWRIGHT_CHANNEL=chromium`. The test covers
MyShop → Backend → reload → Back → Forward, delayed scripts, direct entry/reload for
every guide, search interactivity and uncaught hydration errors. Set `TEST_DOCS_URL`
to an existing docs origin to run the same read-only checks against a deployment.

The client entry also guards history changes before hydration completes. Reloading
a document preserves earlier same-document history entries; an early Back can
change the URL while its HTML and embedded loader data still describe the reloaded
page. Prerendered docs carry their document pathname. If it differs at bootstrap, or
changes before hydration commits, load the destination document instead of hydrating
with mismatched data. The guard is removed after hydration; ordinary navigation stays
client-side. The SPA 404 fallback has no document-path marker to avoid reload loops.
The early-Back regression holds the entry bundle during reload and navigates after
only the server-rendered heading is visible, without waiting for router readiness.
