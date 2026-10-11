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
- Conditional documentation guidance lives in `docs/agents-md/docs-website.md` and is
  explicitly included by this repository's `agents-md/index.md` compiler entry.

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

Docs deploy independently using `apps/docs/vercel.json`: project root `apps/docs`,
build `pnpm build`, output `build/client`. Routing serves files and directory indexes
before the SPA 404 fallback; `/api/search` retains its JSON content type.
The landing deployment is independent and unchanged. Its optional Docs navigation
link reads the non-secret `VITE_DOCS_URL` build value; the committed production build value was derived from the verified
`inproduct-docs.vercel.app` hostname. No landing is required
for docs hosting, and no docs deployment is required to build the landing.

Use a dedicated docs hostname as the location convention, initially the actual
provider-assigned hostname. A custom `docs.<project-domain>` is optional and needs
one-time domain/DNS verification. The verified project is `inproduct-docs` (`prj_LQy5bWkXPbzDurQBAqQ6XB1Kx1Oq`),
public hostname `inproduct-docs.vercel.app`. ArcNet selects only this docs project;
the landing retains its existing Vercel Git deployment trigger.
ArcNet tooling owns builds, static artifacts, reference validation and deployment;
operator prerequisites are an existing provider account and scoped encrypted
credential access. Project creation remains a separate approved step in the
current adapter. Automatic hostname registration and a shared URL-to-project
configuration convention are missing reusable onboarding features, not application
requirements to couple landing/docs. No new account, seat, GCP or DNS change is
required to use the default provider hostname.
MyShop is private and local-only and must never be included in a public deployment.
