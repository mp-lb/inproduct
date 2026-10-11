# MyShop — local only

A private React/Vite example with four synthetic products, a cart and a small product editor.
InProduct supplies `slugify`; catalog validation, uniqueness and cart logic belong to this app.
State lives in memory in the current tab. Reload or **Reset demo** restores deterministic seeds.
No database, authentication, payments, orders, customer data, API keys or external services.

From the repository root:

```sh
zap task setup
zap task myshop
zap status
```

Open the loopback URL reported by Zap. Use **Manage products** to add, rename, price or delete
products; switch back to **Storefront** to see updates. Reset clears the cart too.
Run `zap down myshop` when finished.

The package is `private: true`, excluded from Changesets, and has no ordinary `build` or
`start` script. `pnpm --filter @mp-lb/inproduct-myshop build:local` is an explicit local
verification build only. Never configure a deployment or publish this app. Vite binds to
127.0.0.1. Do not override the host, expose a tunnel or serve the generated files publicly.
