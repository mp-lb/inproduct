import process from "node:process";
import console from "node:console";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { readStandardSecrets } from "./readStandardSecrets.mjs";
import { selectCredentials } from "./selectCredentials.mjs";
import { maskCommand, runSecretProcess } from "./secretProcess.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const main = async () => {
  process.chdir(root);
  const [command, ...extra] = process.argv.slice(2);
  if (extra.length || !["validate", "deploy", "publish"].includes(command))
    throw Error("Usage: node scripts/secrets/run.mjs validate|deploy|publish");
  if (
    command !== "validate" &&
    (process.env.GITHUB_ACTIONS !== "true" ||
      process.env.GITHUB_REPOSITORY !== "mp-lb/inproduct" ||
      process.env.GITHUB_REF !== "refs/heads/main")
  )
    throw Error(
      "Credential-consuming commands require the configured repository main CI job.",
    );

  if (command === "deploy") {
    const config = JSON.parse(
      readFileSync(resolve(root, ".arcnet/project.json"), "utf8"),
    );

    if (
      config.approved !== true ||
      Object.values(config.sites).some((site) => site.mode !== "existing")
    )
      throw Error(
        "ArcNet remains disabled until references and cutover are approved.",
      );
  }

  const key = process.env.SECRETS_KEY;
  delete process.env.SECRETS_KEY;
  delete process.env.DOCTRINE_RECIPIENT_SECRET;
  const values = await readStandardSecrets(root, key);

  if (command === "validate") {
    selectCredentials(values, "deploy");
    selectCredentials(values, "publish");
    console.log(
      "Standard snapshot decrypts; deployment and publishing field selection passed. No provider requests or mutations performed.",
    );

    return;
  }

  const selected = selectCredentials(values, command);
  for (const value of new Set(Object.values(selected)))
    process.stdout.write(maskCommand(value));
  if (command === "deploy")
    runSecretProcess(
      process.execPath,
      [resolve(root, ".arcnet/run.mjs"), "deploy"],
      process.env,
      selected,
    );
  else
    runSecretProcess("pnpm", ["changeset", "publish"], process.env, selected);
  console.log(`${command} completed.`);
};

main().catch((error) => {
  // Only our fixed diagnostics are exposed; crypto, parser and child errors are
  // normalized at their boundaries, never forwarded with secret-bearing input.
  console.error(error.message);
  process.exitCode = 1;
});
