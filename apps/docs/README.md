# InProduct docs

Fumadocs React Router SPA, generated with create-fumadocs-app 16.2.18.
Content is explicitly opted in from `docs/public/` only. Search is built locally;
`/llms-full.txt` and per-page Markdown are prerendered alongside HTML.

From the repository root: `zap task setup`, then `zap up docs` and `zap status`.
Build with `pnpm --filter @mp-lb/inproduct-docs build`. Output: `apps/docs/build/client`.

No docs hosting has been created or configured. The existing `apps/frontend/vercel.json`
belongs to the landing page; there is no checked-in Vercel project linkage for docs.
If Felix connects an approved docs project manually, the standalone output is above.
MyShop must never be included in a public deployment.

Zap enables polling for docs file watching to avoid macOS watcher limits on shared hosts.
