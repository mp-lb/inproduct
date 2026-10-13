# Shared CI credentials

InProduct consumes a ciphertext snapshot of Forum store `mp-lb/mp-lb`,
`/admin/standard-secrets.json.enc`. This is a Forum store, not a GitHub fetch URL.
`.secrets/standard-secrets.source.json` records the file ID, revision and SHA-256.
CI reads the committed snapshot; it does not need a Forum session or API token.

Refresh from an authorized local Forum session with `pnpm secrets:sync`.
This runs `fm file info/read --store mp-lb/mp-lb` against that exact path,
checks stable identity/revision, validates the v3 envelope, and writes ciphertext
and provenance only. Review and commit both files together. CI intentionally
uses that reviewed version until refreshed; provider rotations require a refresh.

GitHub supplies `SECRETS_KEY` only to the credential-consuming step. The pinned,
lockfile-verified `@mp-lb/forum-secrets@0.2.1` decryptor reads the v3 envelope in
memory. The selected fields are `NPM_TOKEN` (`NODE_AUTH_TOKEN` alias) for npm publication. Unrelated catalog fields are ignored and may be structured values. Both
aliases may exist only with identical nonempty values; missing, malformed or
conflicting fields fail closed. There is no fallback to another project's token.

`node scripts/secrets/run.mjs validate` checks decryption and publishing credential selection
without provider/network operations. The validation workflow runs on relevant
main changes or manual dispatch on main, with no plaintext files, artifacts,
caches or outputs. It does not test provider authorization or token validity.

The release workflow invokes the loader for npm publishing. Only selected
credentials enter an allowlisted child environment. The decryption key and
unrelated catalog/application values do not reach child processes. Third-party
stdout/stderr is withheld in credential-bearing commands to prevent leaks;
failure reports are deliberately generic. Child HOME/temp/cache paths are isolated
and removed on completion/failure; npm debug-log retention is disabled. GitHub mask commands are escaped.

Project-specific app values remain separate in `.env` for local development.
The shared catalog is never merged into an app environment pool.

Anyone able to use this shared key can decrypt the entire standard catalog,
even though these scripts export only the required fields. This is the explicitly
chosen shared trust boundary. The checksum detects accidental snapshot mismatch;
Git review protects intentional updates. Protect main/workflow edits and restrict
who can run trusted jobs. Recipient-only rotation cannot revoke access to an old
wrapped data key; compromise recovery needs new data keys and provider tokens.

Website deployment workflows have been removed. MyShop remains local-only.
The encrypted snapshot remains because npm publishing consumes it; no deployment
credentials are required by validation or exported by the publishing command.

The library 0.0.2 is already published. This integration creates no changeset and
must not republish it. Subsequent intended changesets use the existing release
workflow, now constrained to the configured repository main branch.

