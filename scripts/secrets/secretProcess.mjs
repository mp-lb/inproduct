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
  let diagnostic = "";
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
        NO_UPDATE_NOTIFIER: "1",
        NPM_CONFIG_UPDATE_NOTIFIER: "false",
      },
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 16 * 1024 * 1024,
    });

    commandFailed = Boolean(result.error) || result.status !== 0;

    if (commandFailed) {
      const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;

      const codes = [
        "E401",
        "E403",
        "E404",
        "EOTP",
        "ENEEDAUTH",
        "EPUBLISHCONFLICT",
        "EPRIVATE",
        "ENOENT",
        "ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND",
        "ERR_PNPM_UNSUPPORTED_ENGINE",
        "ERR_PNPM_GIT_UNCLEAN",
        "ERR_PNPM_NOTHING_TO_DEPLOY",
        "ERR_PNPM_BAD_PM_VERSION",
        "ERR_PNPM_FETCH_401",
        "ERR_PNPM_FETCH_403",
        "ERR_PNPM_FETCH_404",
        "ERR_PNPM_NO_AUTH",
        "ERR_PNPM_AUTH_REQUIRED",
        "ERR_PNPM_CANNOT_RESOLVE_WORKSPACE_PROTOCOL",
        "ERR_PNPM_OUTDATED_LOCKFILE",
        "ERR_PNPM_NO_MATCHING_VERSION",
        "ERR_PNPM_BRANCH_IS_BEHIND",
        "ERR_PNPM_GIT_UNKNOWN_BRANCH",
        "ERR_PNPM_NOT_YET_SUPPORTED",
        "ERR_PNPM_INVALID_OPTION",
        "ERR_PNPM_CONFIG_CONFLICT_AUTH_TYPE",
        "ERR_PNPM_NO_PUBLISHING_AUTH",
      ];

      const found = codes.filter(
        (code) => output.includes(code) || result.error?.code === code,
      );

      diagnostic = found.length
        ? ` Recognized error codes: ${found.join(", ")}.`
        : " No recognized error code.";

      const phrases = [
        "Unknown option",
        "404 Not Found - PUT",
        "404 Not Found - GET",
        "Access token expired",
        "two-factor",
        "No authorization header",
        "not authorized",
        "permission",
        "not allowed",
        "ENEEDAUTH",
        "Failed to replace env",
        "npm error",
        "an error occurred while publishing",
        "Unable to authenticate",
        "auth token",
        "provenance",
        "ERR_PNPM",
        "authentication",
        "already exists",
      ];

      const hints = phrases.filter((phrase) =>
        output.toLowerCase().includes(phrase.toLowerCase()),
      );

      diagnostic += ` Recognized categories: ${hints.join(", ") || "none"}.`;
    }
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
        diagnostic +
        (cleanupFailed
          ? " Temporary credential data cleanup also failed."
          : ""),
    );
  if (cleanupFailed)
    throw Error(
      "Credential-consuming command succeeded, but temporary credential data cleanup failed. Verify the remote result before retrying.",
    );
};
