## Documentation

This project publishes docs generated from the source of truth. A library's API reference comes from its types, and a CLI's command reference comes from its command tree. After changing a public API or CLI command, run `docs:gen` and commit the generated reference and agent bundle. CI runs `docs:check` to catch stale output. Keep hand-written guides beside generated references and link to signatures rather than repeating them.

Read `libs.md` from `mp-lb/dev` for the full model (`fm read libs.md --store mp-lb/dev`). For packages with a CLI, also read `clis.md` from that store.
