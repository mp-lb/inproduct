import process from "node:process";
import console from "node:console";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, renameSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { verifySnapshot } from "./readStandardSecrets.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const store = "mp-lb/mp-lb",
  path = "/admin/standard-secrets.json.enc";

const fm = (operation) => {
  const result = spawnSync(
    "fm",
    [
      "file",
      operation,
      path,
      "--store",
      store,
      ...(operation === "info" ? ["--json"] : []),
    ],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 16 * 1024 * 1024,
    },
  );

  if (result.error || result.status !== 0)
    throw Error(
      "Forum ciphertext read failed; verify local Forum access separately.",
    );
  return result.stdout;
};

try {
  if (process.argv.length !== 2)
    throw Error("Usage: node scripts/secrets/sync.mjs");
  if (process.env.GITHUB_ACTIONS === "true")
    throw Error(
      "Refresh ciphertext from an authorized local Forum session, not CI.",
    );
  const before = JSON.parse(fm("info"));
  const text = fm("read");
  const after = JSON.parse(fm("info"));
  if (
    before.id !== after.id ||
    before.revisionNumber !== after.revisionNumber ||
    after.path !== path
  )
    throw Error(
      "Forum source changed during refresh; retry before committing.",
    );

  const source = {
    store,
    path,
    fileId: after.id,
    revision: after.revisionNumber,
    sha256: createHash("sha256").update(text).digest("hex"),
  };

  verifySnapshot(text, source);
  const folder = resolve(root, ".secrets");
  mkdirSync(folder, { recursive: true });

  for (const [name, content] of [
    ["standard-secrets.json.enc", text],
    ["standard-secrets.source.json", JSON.stringify(source, null, 2) + "\n"],
  ]) {
    const destination = resolve(folder, name),
      temporary = `${destination}.tmp`;

    try {
      writeFileSync(temporary, content, { mode: 0o600 });
      renameSync(temporary, destination);
    } finally {
      rmSync(temporary, { force: true });
    }
  }

  console.log(
    `Refreshed encrypted standard snapshot at Forum revision ${source.revision}. Review and commit ciphertext plus provenance together.`,
  );
} catch {
  console.error(
    "Ciphertext refresh failed; no plaintext was requested. Check source identity/access and retry.",
  );

  process.exitCode = 1;
}
