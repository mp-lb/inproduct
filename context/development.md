## Development

Use pnpm for dependencies and Zap for service orchestration. Run `zap status`, `zap up`, and `zap logs <service> --no-follow` to manage local services. Ports are allocated by Zap through zap.yaml; do not commit numeric local ports. Non-secret defaults live in .env.local; secrets belong in the ignored .env.

MyShop (`apps/myshop-frontend` and `apps/myshop-backend`) is private and local-only; never publish or deploy it. Run `zap task myshop` for the seeded demo and `zap task myshop-check` for its explicit local build. Ordinary builds exclude both MyShop apps. Uploaded files persist in ignored `apps/myshop-backend/.data/files`; reset only affects the catalog/cart. Root validations use `packages/scripts/runValidation.ts` and share the per-user heavy-task lock; do not nest wrapped commands or remove the lock.

Bootstrap dependencies with `zap t setup` before running TypeScript tasks. The validation runner uses the same persistent OS file lock as older checkouts, with a 2 GiB Node heap (4 GiB for lint) and one worker; setup installs dependencies directly so a fresh checkout does not require an already installed runner.
