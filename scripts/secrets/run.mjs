import process from "node:process";
import console from "node:console";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readStandardSecrets } from "./readStandardSecrets.mjs";
import { selectCredentials } from "./selectCredentials.mjs";
import { maskCommand, runSecretProcess } from "./secretProcess.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const main = async () => {
  process.chdir(root);
  const [command, ...extra] = process.argv.slice(2);
  if (extra.length || !["validate", "publish"].includes(command))
    throw Error("Usage: node scripts/secrets/run.mjs validate|publish");
  if (
    command !== "validate" &&
    (process.env.GITHUB_ACTIONS !== "true" ||
      process.env.GITHUB_REPOSITORY !== "mp-lb/inproduct" ||
      process.env.GITHUB_REF !== "refs/heads/main")
  )
    throw Error(
      "Credential-consuming commands require the configured repository main CI job.",
    );

  const key = process.env.SECRETS_KEY;
  delete process.env.SECRETS_KEY;
  delete process.env.DOCTRINE_RECIPIENT_SECRET;
  const values = await readStandardSecrets(root, key);

  if (command === "validate") {
    selectCredentials(values, "publish");
    console.log(
      "Standard snapshot decrypts; publishing field selection passed. No provider requests or mutations performed.",
    );

    return;
  }

  const selected = selectCredentials(values, command);
  for (const value of new Set(Object.values(selected)))
    process.stdout.write(maskCommand(value));

  if (command === "publish") {
    const response = await globalThis.fetch(
      "https://registry.npmjs.org/-/whoami",
      {
        headers: { Authorization: `Bearer ${selected.NPM_TOKEN}` },
        signal: globalThis.AbortSignal.timeout(30000),
      },
    );

    if (!response.ok)
      throw Error(
        `npm credential verification failed (HTTP ${response.status}); update the shared publishing token.`,
      );
    console.log("npm publishing token authenticated successfully.");
    // pnpm 11 uses native registry auth; pass the selected credential explicitly.
    selected["pnpm_config_//registry.npmjs.org/:_authToken"] =
      selected.NPM_TOKEN;
  }

  runSecretProcess("pnpm", ["changeset", "publish"], process.env, selected);
  console.log(`${command} completed.`);
};

main().catch((error) => {
  // Only our fixed diagnostics are exposed; crypto, parser and child errors are
  // normalized at their boundaries, never forwarded with secret-bearing input.
  console.error(error.message);
  process.exitCode = 1;
});
