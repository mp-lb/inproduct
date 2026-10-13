# MyShop backend — local only

A Node HTTP server that demonstrates `@mp-lb/inproduct-storage`. File operations,
request validation, persistence and transport live in the library; this app wires
its disk adapter and handler together and restricts access to the local demo.

Run `zap task myshop` from the repository root to build the libraries and start both
MyShop services. Zap allocates `MYSHOP_BACKEND_PORT` and `MYSHOP_FRONTEND_PORT`.
The backend binds to `127.0.0.1`; Vite proxies `/api/files` to it. `GET /health` reports
readiness. Use `zap logs myshop-backend --no-follow` for logs.

Files and metadata persist in ignored `.data/files` next to this README. Browser
refresh, frontend restart, backend restart and **Reset demo** leave files intact.
Use each file's confirmed Delete action to remove it. The catalog/cart are still
frontend-only examples; the file-storage feature demonstrates the backend library.

This single-process demo has no user login, scanning or production tenancy. Its
origin/host checks support loopback use only. Never deploy, publish, tunnel, or
expose either MyShop service publicly. Both packages are private, excluded from
Changesets and ordinary builds, and have no production start script.

Run `zap task myshop-check` for the explicit local builds. Backend tests exercise
the real HTTP API in a temporary directory; library tests cover disk restart durability.
