# InProduct landing page

The public React/Vite marketing site, separate from the local MyShop demo.

Run `zap up landing-page` from the repository root. Zap supplies `LANDING_PAGE_PORT`.
The Docs navigation link uses `VITE_DOCS_URL`. Its production value is declared in
`.arcnet/arcnet.yaml` and passed to the ArcNet site build.

The app folder and package were renamed from `apps/frontend` and
`@mp-lb/inproduct-frontend`. Its Vercel project Root Directory must be
`apps/landing-page` before the next landing deployment. MyShop lives in the separate
`apps/myshop-frontend` and `apps/myshop-backend` folders and must never be deployed.
