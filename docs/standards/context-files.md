# Context files

Fssstack projects keep agent context easy to inspect and easy to regenerate.

The committed source of truth consists of project source and shared references:

- `context/` contains the project-level source blocks.
- Forum links in those blocks reference shared context from
  `mp-lb/fssstack/agents-md`.

The generated runtime files are committed:

- `AGENTS.md`
- `CLAUDE.md`

They are deterministic build outputs. Regenerate and commit them whenever the
local context source or a referenced Forum block changes.

## Tasks

Each project should expose `zap task context-build`. It
first compiles local `@` imports, then resolves Forum file links, and writes
`AGENTS.md` and `CLAUDE.md` directly.

The build task accepts output flags for agent-specific files:

- `--agents` writes only `AGENTS.md`.
- `--claude` writes only `CLAUDE.md`.

When neither flag is present, both local files are written.

## Workflow

After cloning or syncing a project, run:

```bash
zap task context-build
```

That produces the local files expected by coding agents from the committed
sources.

The important invariant is that reviewers see both the source blocks in
`context/` and the generated agent files they produce.
