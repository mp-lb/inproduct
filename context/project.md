# 👑 InProduct

A collection of tools to put in your product.

Read MANIFESTO.md for the product philosophy. Setup values live in fssstack.yaml.

## Packages

- apps/landing-page: `@mp-lb/inproduct-landing-page`, public React/Vite marketing site.
- apps/myshop-frontend: `@mp-lb/inproduct-myshop-frontend`, local-only React/Vite library demo.
- apps/myshop-backend: `@mp-lb/inproduct-myshop-backend`, local-only Node HTTP demo using the storage library handler and disk adapter.
- packages/storage: `@mp-lb/inproduct-storage`, object/file storage, memory and disk adapters, HTTP transport and headless React hooks.
- packages/inproduct: `@mp-lb/inproduct`, publishable library.
- packages/core, packages/server, packages/trpc: private shared schemas, server helpers, and API router.

MyShop demonstrates the public libraries through a real frontend/backend boundary. No extensions are enabled.

The storage library provides MongoDB and S3 adapters for consumers and local tests. MyShop remains local-only with its existing disk adapter; these adapters do not imply deployed database or object-storage services.

### Related tooling

Shared tooling is developed in sibling checkouts under `~/Work`: Zapper (`zapper`) runs tasks, Forum (`forum`) provides `fm`, Tools (`tools`) provides ArcNet, and Stackforge (`stackforge`) owns setup conventions. When a change belongs in an owned dependency, inspect and update that source repository as needed, follow its `AGENTS.md`, then rebuild/relink the CLI or update the consuming dependency. Verify the command resolves to the intended build.
