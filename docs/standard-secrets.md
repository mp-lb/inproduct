# Shared CI credentials

InProduct uses `@mp-lb/arcnet` for encrypted secrets. `.arcnet/secrets.json` lists ordered Forum sources and consumer mappings. Later sources override earlier values. Each source has its own GitHub decryption secret; no plaintext is committed.

The standard source is `mp-lb/mp-lb:/admin/standard-secrets.json.enc`, using the existing `SECRETS_KEY`. CI decrypts its reviewed snapshot under `.arcnet/secrets/`. Run `pnpm secrets:sync` from an authenticated local Forum session after changing the remote file, then review and commit the new ciphertext and configuration together. This also updates source-key references in workflows.

`pnpm secrets:check` checks decryption and required fields without printing values or calling providers. The validation workflow runs this in GitHub, where the key is available. The publishing consumer selects only npm credentials; the shared catalog and decryption keys never reach the publishing subprocess. The release workflow separately checks npm authentication before publishing.

The project override layer is `mp-lb/mp-lb:/projects/inproduct/secrets.json.enc`, using `INPRODUCT_SECRETS_KEY`. On a new installation, the following command prompts for your Forum encryption password, creates an empty encrypted file, creates its recipient, and uploads the key directly to GitHub. Project files follow `mp-lb/mp-lb:/projects/<slug>/secrets.json.enc`; the parent directory must exist in the selected store.

```sh
pnpm exec arcnet secrets init --name project --store mp-lb/mp-lb --path /projects/inproduct/secrets.json.enc --key-env INPRODUCT_SECRETS_KEY --repository mp-lb/inproduct
```

Edit that file in Forum, then sync and commit. Add consumer mappings only for variables needed by that consumer. The generic setup guide uses hello-world; this file documents InProduct's actual configuration.

A file's UI token decrypts its ciphertext; it does not authorize a live Forum read. Snapshot-based CI needs no Forum session. Live loading is supported separately by ArcNet with an authenticated `fm` CLI. See the [ArcNet secrets guide](https://github.com/mp-lb/tools/tree/main/packages/arcnet#layered-secrets).

This integration does not deploy websites or MyShop, and does not request an npm release. MyShop remains local-only.
