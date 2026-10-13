# MyShop frontend — local only

A private React/Vite library demo with a storefront, cart, product editor and
**Admin → File storage**. Its backend is `apps/myshop-backend`; this is not Next.js.

```sh
zap task setup
zap task myshop
zap o MyShop
```

The task builds the libraries and starts both MyShop services. The frontend calls
`createFileStorageClient('/api/files')` and `useFileStorage(client)`; Vite forwards
requests to the backend using Zap's `MYSHOP_BACKEND_PORT`. File operations and
persistence are supplied by the library. The frontend owns the table and forms.

Upload a file (10 MiB maximum), add a synthetic example, search/filter, edit
metadata, download, or confirm deletion. Files survive browser reloads and backend
restarts in ignored `apps/myshop-backend/.data/files`. They are unscanned.
Catalog/cart state is tab-local; **Reset demo** restores products and clears the
cart without deleting stored files. InProduct's `slugify` supplies product slugs.

Use `zap logs myshop-frontend --no-follow` and `zap logs myshop-backend --no-follow`
for logs. Stop with `zap down myshop-frontend myshop-backend`.
`zap task myshop-check` explicitly builds both local-only apps.

Both MyShop packages are private, excluded from publication and ordinary builds,
and have no production start scripts. Never deploy, tunnel or expose them publicly.
The separate `apps/landing-page` is the public marketing site.
