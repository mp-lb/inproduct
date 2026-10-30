## Documentation

Keep InProduct-specific documentation in `docs/`. `docs/public/` contains the published library guides and `docs/internals/` contains internal engineering notes. Root-level project documents such as `README.md` and `MANIFESTO.md` stay at the repository root. Shared standards and extensions belong in Forum.

This project publishes docs generated from the source of truth. A library's API reference comes from its types, and a CLI's command reference comes from its command tree. After changing a public API or CLI command, run `docs:gen` and commit the generated reference and agent bundle. CI runs `docs:check` to catch stale output. Keep hand-written guides beside generated references and link to signatures rather than repeating them.

Read `libs.md` from `mp-lb/dev` for the full model (`fm read libs.md --store mp-lb/dev`). For packages with a CLI, also read `clis.md` from that store.

Read shared standards with `fm read <file>.md --store mp-lb/dev` (list them with `fm ls --store mp-lb/dev`). Read shared extensions with `fm read extensions/<extension>/README.md --store mp-lb/fssstack` (list them with `fm ls extensions --store mp-lb/fssstack`).

Relevant standards include `style-guide.md` for code changes, `errors.md` for error handling, `trpc.md` for API work, `logging.md` and `event-schema.md` for events, and `libs.md` and `lib-release.md` for publishable libraries.

InProduct has no dedicated Forum store or `.forum/` sync configuration.
