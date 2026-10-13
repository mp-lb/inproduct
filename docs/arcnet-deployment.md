# Independent InProduct docs deployment

Docs: https://inproduct-docs.vercel.app/docs
Landing: https://inproduct.mp-lb.dev

The apps build and deploy independently. Docs project inproduct-docs was created
under existing Pro team mp-lb with framework:null and no Git link, new plan, seats,
add-ons, credentials or DNS changes. Account and hostname were verified by REST.
Project ID: prj_LQy5bWkXPbzDurQBAqQ6XB1Kx1Oq.

ArcNet repo config selects only docs. Pushes to main build apps/docs and deploy
its static output using the shared encrypted credentials through
scripts/secrets/run.mjs. GitHub receives SECRETS_KEY only; no direct VERCEL_TOKEN
configuration is needed. Publishing is separate; pending Changesets are not part of docs deployment.
The landing continues its original Vercel Git main trigger and project.

The docs location convention is a dedicated hostname. The initial default uses
the verified provider hostname, without custom DNS. Setup derived the public
landing build value in apps/landing-page/.env.production; no dashboard variable is
needed. The landing's Docs link is optional so it still builds without docs.
Local Zap supplies its allocated DOCS_PORT through the non-secret local default.

Independent docs config: apps/docs/vercel.json. ArcNet upload configuration serves
files first, directory index pages next, unknown paths with 404.html/status404,
and /api/search with application/json. MyShop app is excluded from deployment;
its public documentation is allowed. Local launch: zap task myshop, then zap o MyShop.

## Onboarding defaults and remaining reusable gap

One per-project location should be sufficient after operator account and encrypted
credential prerequisites. Onboarding should derive the docs project identity,
standard build/output/routes and landing link from the verified hostname. Current
ArcNet performs safe setup, identity validation and deployment; explicit project
creation and recording the provider hostname were performed here as authorized
onboarding steps. A reusable hostname-to-project orchestration command and optional
custom-domain ownership/DNS automation remain separately scoped improvements.
Neither app should own the other's build or deployment. Custom docs.<project-domain>
is optional and requires owner-authorized domain/DNS verification; it is not needed
for this deployment.

## Rollback

Disable Deploy ArcNet static sites in GitHub Actions, cancel in-flight jobs and set
.arcnet/project.json approved=false to prevent further docs uploads. For an existing
docs production version, use Vercel Instant Rollback and select the retained known-good
deployment. Rollback disables domain auto-assignment; explicitly Undo Rollback with
the intended deployment to resume automatic production assignment. The landing
Git trigger and live project do not need changing for docs rollback.

Sources checked 2026-10-11:
- https://vercel.com/docs/instant-rollback
- https://vercel.com/docs/plans/pro-plan
- https://vercel.com/docs/limits

Existing Pro pricing has no ordinary per-project subscription; static usage and
deployment storage may add metered charges. No zero-cost guarantee is made.

## App folder names

The marketing site now lives at `apps/landing-page` (formerly `apps/frontend`).
A Git-connected Vercel project must use `apps/landing-page` as its Root Directory
before deployment. The manual `Deploy landing page` GitHub workflow verifies
the existing project owns `inproduct.mp-lb.dev`, updates its Root Directory,
and deploys the selected main commit through the existing Git integration. MyShop is split into `apps/myshop-frontend` and
`apps/myshop-backend`; both remain excluded from deployment.
