# ArcNet deployment proposal (disabled)

Prepared from StackForge commit 392ba6a on 2026-10-11. No live deployment,
project creation, credentials, settings or DNS changes were performed. Do not push
this branch until review. The generated workflow skips deployment while
`.arcnet/project.json` has `approved: false` or any site is new.

## Verified targets and setup

Team mp-lb: `team_1w5PsP1pNWCex9vAwF4PqvTs` (existing Pro plan).
Landing inproduct: `prj_BZ7htFNVvwtaUiJSgVSc2RIWEe49`, GitHub
mp-lb/inproduct, production branch main, root apps/frontend. Read-only REST
project/team lookups verified these references. A scoped GET /v9/projects/inproduct-docs returned 404 (not found); creation
rechecks name conflicts before making changes.

From the target repository root, regenerate safely with:

```sh
node ~/Work/stackforge/arcnet/setup.mjs inproduct
node .arcnet/run.mjs plan
```

StackForge dependencies must already be installed (`zap t arcnet-setup` there).
The committed input is arcnet.vercel.json; after generation project.json is
canonical. Keep both selections aligned when changing references. No Terraform,
GCP, state bucket, backend service or Dockerfile is required for these static sites.
The npm library release is separate. MyShop is local-only and is never selected.

## Routing and preview acceptance

Landing routing preserves its SPA fallback, clean HTML URLs and trailing-slash
redirect intent. Existing apps/frontend/vercel.json is unchanged. Docs routes
serve actual files first (including extensionless api/search, llms.txt,
llms-full.txt and llms.mdx/docs/**), then directory index.html, then 404.html
with status 404. The Fumadocs worker confirmed this interface; blanket SPA
rewrites would shadow prerendered pages/search. Both builds select only their
own pnpm package and stage only static output.

Before approving production, an authorized preview must verify landing root,
assets, nested SPA path and redirects; docs root, /docs, a nested docs page,
/api/search JSON, Markdown and llms resources, and unknown-path 404. Local output
checks cannot prove Vercel edge routing. Uploading previews requires explicit
permission and may incur usage; none were uploaded during preparation.

## Necessary owner actions

1. Approve creation of exactly one static project, inproduct-docs, under mp-lb,
   or supply a separately verified existing docs reference. For approved creation,
   set docs.creationApproved=true in .arcnet/project.json and run locally
   `node .arcnet/run.mjs create docs` with authorized VERCEL_TOKEN. Review the
   recorded ID and copy it into arcnet.vercel.json as mode existing; keep overall
   approved=false. This is a remote mutation, separate from setup.
2. Authorize token access for both projects and configure GitHub environment
   arcnet-production, secret VERCEL_TOKEN, and suitable environment protections.
   No additional secret names are required. Do not add a deploying seat solely
   for this setup without reviewing its separate monthly cost.
3. Authorize local preview uploads, set approved=true only in a local review
   checkout, run `node .arcnet/run.mjs preview`, complete the route checks, then
   reset approved=false. Do not commit the preview approval prematurely.
4. Approve the production handoff below, including both target IDs and a retained
   rollback deployment. All configuration changes and production uploads require
   owner authorization. The branch is currently unpushed.

## Costs (read-only verification)

mp-lb already uses Pro. Official Pro pricing bills platform/seats, add-ons and
usage, not an ordinary additional project fee; Pro project count is unlimited.
Thus creating this static project without seats or add-ons is not a new fixed
project subscription (inference from the pricing model). Hosting is not guaranteed
free: deployment storage and CDN usage can add charges to the team's existing
bill; exact incremental cost depends on retention, output size and traffic.
Pro lists a $20/month platform fee with one deploying seat and $20 usage credit;
additional Owner/Member seats are $20/month each. Deployment Storage lists
$0.10/GB/month. No estimate of available credit or zero-cost assurance is made.
Owner should review current usage/spend limits before approving creation/uploads.

Sources checked 2026-10-11:
- https://vercel.com/docs/plans/pro-plan
- https://vercel.com/docs/limits
- https://vercel.com/changelog/deployment-storage-keeps-your-deployments-rollback-ready

## Production handoff and rollback (proposal only)

Keep current Git production deployment running until preview acceptance. Before
cutover record the current production deployment ID/URL and its attached domains,
verify rollback eligibility/retention, and pause main merges during handoff.
At the approved cutover commit, add git.deploymentEnabled={"main":false} to
apps/frontend/vercel.json (the verified Vercel project root), preserving its
routing fields. Unspecified branches retain their Git previews. In the same
reviewed commit, set .arcnet/project.json approved=true only after all selections
are existing. Push main: Vercel Git production is suppressed by that config;
ArcNet Actions becomes the production owner. Check the configuration gate,
protected-environment approval, both uploads and production route checks.
Do not use an Ignored Build Step as the switch; it still consumes deployment quota.
Docs is created without a Git link, so no docs Git trigger needs disconnecting.

If a production upload fails or routing regresses, stop ArcNet first: disable
Deploy ArcNet static sites in GitHub Actions (Actions > workflow > menu > Disable
workflow), cancel any queued/running deployment, and revert approved to false
before another main push. In Vercel inproduct overview choose Instant Rollback,
select the retained previous production deployment, verify domains, Continue,
Confirm Rollback. Pro allows eligible previous production deployments; previews
are not eligible. Rollback turns OFF automatic production-domain assignment.
Do not assume restoring Git triggers alone resumes production. To restore the
old Git flow, remove the main:false Git setting after ArcNet is disabled, then
use Undo Rollback on the production tile, select the intended known-good
Git-built deployment, Confirm. This promotes it and restores domain assignment.
Verify the next intended main deployment. Docs rollback is separate if it already
had a production deployment; multi-site uploads/rollbacks are not atomic.

Official controls:
- https://vercel.com/docs/project-configuration/git-configuration
- https://vercel.com/docs/instant-rollback
- https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/disabling-and-enabling-a-workflow

## Optional changes

A custom docs domain, DNS updates and Search Console verification are optional;
use the default Vercel project domain first. No domain purchase, DNS transfer,
GCP work, paid add-on, project setting adoption or Terraform import is required.

## Local validation evidence

Zap worktree-setup passed under the shared heavy-task queue. Target typecheck,
lint, tests and build passed; lint retains two existing Fumadocs default-export
warnings. Build verified HTML, Markdown, search and SPA 404 output. The exact
generated runner is excluded from application lint because its source/test
ownership is StackForge; ArcNet 24 local tests passed. Setup rerun preserved
files; offline check/plan passed. No cloud deployment or edge routing was tested.
