import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const allowed = [
  "PATH",
  "HOME",
  "TMPDIR",
  "TMP",
  "TEMP",
  "SystemRoot",
  "LANG",
  "CI",
  "GITHUB_ACTIONS",
  "GITHUB_REPOSITORY",
  "GITHUB_REF",
  "GITHUB_SHA",
  "NPM_CONFIG_USERCONFIG",
  "npm_config_userconfig",
];

export const childEnvironment = (environment, selected = {}) => ({
  ...Object.fromEntries(
    allowed
      .filter((key) => typeof environment[key] === "string")
      .map((key) => [key, environment[key]]),
  ),
  ...selected,
});

export const maskCommand = (value) =>
  `::add-mask::${value.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A")}\n`;

export const runSecretProcess = (
  command,
  args,
  environment,
  selected,
  run = spawnSync,
  remove = rmSync,
) => {
  // The secret-bearing process never inherits the catalog key or unrelated tokens.
  // Capture and discard output: third-party diagnostics may contain credentials.
  const temporary = mkdtempSync(
    join(tmpdir(), "inproduct-credential-command-"),
  );

  let commandFailed = false;
  let cleanupFailed = false;

  try {
    const result = run(command, args, {
      env: {
        ...childEnvironment(environment, selected),
        HOME: temporary,
        TMPDIR: temporary,
        TMP: temporary,
        TEMP: temporary,
        XDG_CACHE_HOME: join(temporary, "cache"),
        NPM_CONFIG_CACHE: join(temporary, "npm-cache"),
        NPM_CONFIG_LOGS_MAX: "0",
      },
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 16 * 1024 * 1024,
    });

    commandFailed = Boolean(result.error) || result.status !== 0;
  } catch {
    commandFailed = true;
  } finally {
    try {
      // npm/CLI descendants can finish writing cache entries just after their
      // parent exits. Node retries transient ENOTEMPTY/EBUSY failures with
      // bounded backoff (five retries, 200 ms linear delay).
      remove(temporary, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 200,
      });
    } catch {
      cleanupFailed = true;
    }
  }

  if (commandFailed)
    throw Error(
      "Credential-consuming command failed; output withheld to protect secrets." +
        (cleanupFailed
          ? " Temporary credential data cleanup also failed."
          : ""),
    );
  if (cleanupFailed)
    throw Error(
      "Credential-consuming command succeeded, but temporary credential data cleanup failed. Verify the remote result before retrying.",
    );
};
