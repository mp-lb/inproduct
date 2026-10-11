import { Buffer } from "node:buffer";
import { test } from "node:test";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import assert from "node:assert/strict";
import { createHash, randomBytes, webcrypto } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseSecrets, selectCredentials } from "./selectCredentials.mjs";
import {
  childEnvironment,
  maskCommand,
  runSecretProcess,
} from "./secretProcess.mjs";
import { readStandardSecrets, verifySnapshot } from "./readStandardSecrets.mjs";

test("strict JSON rejects malformed roots without leaking input", () => {
  for (const input of ['{"SECRET":"SYNTHETIC_BAD"', "null", "[]"]) {
    assert.throws(
      () => parseSecrets(input),
      (error) => !error.message.includes("SYNTHETIC_BAD"),
    );
  }
});

test("consumer selection exports only the required shared fields", () => {
  const shared = parseSecrets(
    '{"VERCEL_API_TOKEN":"fake-vercel","NPM_TOKEN":"fake-npm","ATLAS_KEY":"fake-atlas","APP_PASSWORD":"fake-app"}',
  );

  assert.deepEqual(selectCredentials(shared, "deploy"), {
    VERCEL_TOKEN: "fake-vercel",
  });

  assert.deepEqual(selectCredentials(shared, "publish"), {
    NPM_TOKEN: "fake-npm",
    NODE_AUTH_TOKEN: "fake-npm",
  });

  assert.equal(
    Object.hasOwn(selectCredentials(shared, "deploy"), "APP_PASSWORD"),
    false,
  );
});

test("aliases agree or fail closed; empty and multiline tokens are rejected", () => {
  assert.deepEqual(
    selectCredentials(
      { VERCEL_TOKEN: "same", VERCEL_API_TOKEN: "same" },
      "deploy",
    ),
    { VERCEL_TOKEN: "same" },
  );

  for (const values of [
    {},
    { VERCEL_TOKEN: "" },
    { VERCEL_TOKEN: "a", VERCEL_API_TOKEN: "b" },
    { VERCEL_TOKEN: "a\nb" },
  ])
    assert.throws(() => selectCredentials(values, "deploy"));
  assert.throws(() =>
    selectCredentials({ NPM_TOKEN: "a", NODE_AUTH_TOKEN: "b" }, "publish"),
  );
});

test("only selected credentials override ambient environment; no app/key leakage", () => {
  const ambient = {
    PATH: "/bin",
    HOME: "/home/test",
    GITHUB_REF: "refs/heads/main",
    SECRETS_KEY: "fake-key",
    DOCTRINE_RECIPIENT_SECRET: "fake-key",
    NPM_TOKEN: "ambient",
    ATLAS_KEY: "atlas",
    APP_PASSWORD: "app",
    NODE_OPTIONS: "--import=evil",
  };

  const child = childEnvironment(ambient, { NPM_TOKEN: "selected" });
  assert.deepEqual(child, {
    PATH: "/bin",
    HOME: "/home/test",
    GITHUB_REF: "refs/heads/main",
    NPM_TOKEN: "selected",
  });

  assert.deepEqual(childEnvironment(ambient), {
    PATH: "/bin",
    HOME: "/home/test",
    GITHUB_REF: "refs/heads/main",
  });
});

test("mask commands escape workflow control characters", () => {
  assert.equal(maskCommand("a%\r\nb"), "::add-mask::a%25%0D%0Ab\n");
});

test("child failures with secret-bearing diagnostics expose no diagnostics", () => {
  assert.throws(
    () =>
      runSecretProcess("test", [], {}, {}, () => ({
        status: 1,
        error: Error("SYNTHETIC_SECRET"),
        stdout: "SYNTHETIC_SECRET",
        stderr: "SYNTHETIC_SECRET",
      })),
    (error) => !error.message.includes("SYNTHETIC_SECRET"),
  );

  runSecretProcess(
    "test",
    [],
    { SECRETS_KEY: "must-not-inherit" },
    {},
    (_cmd, _args, opts) => {
      assert.equal(opts.env.SECRETS_KEY, undefined);
      assert.deepEqual(opts.stdio, ["ignore", "pipe", "pipe"]);
      return { status: 0 };
    },
  );
});

const fixture = async () => {
  const recipientBytes = randomBytes(32),
    dataBytes = randomBytes(32);

  const encrypt = async (keyBytes, bytes) => {
    const key = await webcrypto.subtle.importKey(
      "raw",
      keyBytes,
      "AES-GCM",
      false,
      ["encrypt"],
    );

    const iv = randomBytes(12);

    const data = await webcrypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      bytes,
    );

    return {
      cipher: "AES-GCM",
      iv: iv.toString("base64"),
      data: Buffer.from(data).toString("base64"),
    };
  };

  const text = JSON.stringify({
    doctrineEncryptedFile: 3,
    ...(await encrypt(
      dataBytes,
      Buffer.from('{"VERCEL_TOKEN":"fake-vercel","NPM_TOKEN":"fake-npm"}'),
    )),
    recipients: [
      {
        label: "github-actions",
        recipientId: "github:synthetic",
        wrappedDataKey: await encrypt(recipientBytes, dataBytes),
      },
    ],
  });

  const source = {
    store: "mp-lb/mp-lb",
    path: "/admin/standard-secrets.json.enc",
    fileId: "214835ec-c206-4e52-a902-a0c4e8878135",
    revision: 17,
    sha256: createHash("sha256").update(text).digest("hex"),
  };

  return {
    text,
    source,
    key: `doctrine-recipient-v1_${recipientBytes.toString("base64")}`,
  };
};

test("pinned registry decryptor accepts synthetic v3; wrong key and altered snapshot fail", async () => {
  const { text, source, key } = await fixture();
  verifySnapshot(text, source);
  assert.throws(() => verifySnapshot(text + " ", source));
  assert.throws(() =>
    verifySnapshot(text, { ...source, store: "other/store" }),
  );

  const root = mkdtempSync(join(tmpdir(), "inproduct-synthetic-secrets-"));

  try {
    mkdirSync(join(root, ".secrets"));
    writeFileSync(join(root, ".secrets/standard-secrets.json.enc"), text);
    writeFileSync(
      join(root, ".secrets/standard-secrets.source.json"),
      JSON.stringify(source),
    );

    assert.deepEqual(await readStandardSecrets(root, key), {
      VERCEL_TOKEN: "fake-vercel",
      NPM_TOKEN: "fake-npm",
    });

    await assert.rejects(
      () => readStandardSecrets(root, "invalid"),
      /cannot decrypt/,
    );

    await assert.rejects(() => readStandardSecrets(root, ""), /required/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("credential command caches/logs are isolated and removed on failure", () => {
  let temporary;
  assert.throws(() =>
    runSecretProcess("test", [], {}, {}, (_cmd, _args, options) => {
      temporary = options.env.HOME;
      assert.ok(existsSync(temporary));
      assert.equal(options.env.NPM_CONFIG_LOGS_MAX, "0");
      assert.equal(options.env.VERCEL_TELEMETRY_DISABLED, "1");
      assert.equal(options.env.NO_UPDATE_NOTIFIER, "1");
      assert.equal(options.env.NPM_CONFIG_UPDATE_NOTIFIER, "false");
      assert.ok(options.env.NPM_CONFIG_CACHE.startsWith(temporary));
      writeFileSync(join(temporary, "fake-log"), "SYNTHETIC_SECRET");
      return { status: 1 };
    }),
  );

  assert.equal(existsSync(temporary), false);
});

test("unrelated catalog fields may have structured values; consumed fields must be strings", () => {
  const values = parseSecrets(
    JSON.stringify({
      NPM_TOKEN: "fake-npm",
      VERCEL_TOKEN: "fake-vercel",
      providerConfig: { account: 42 },
      enabled: true,
    }),
  );

  assert.deepEqual(selectCredentials(values, "deploy"), {
    VERCEL_TOKEN: "fake-vercel",
  });

  assert.deepEqual(selectCredentials(values, "publish"), {
    NPM_TOKEN: "fake-npm",
    NODE_AUTH_TOKEN: "fake-npm",
  });

  for (const value of [42, false, null, {}, []])
    assert.throws(() => selectCredentials({ NPM_TOKEN: value }, "publish"));
});

test("cleanup uses bounded retries and preserves a failed command's outcome", () => {
  let cleanupCalled = false;
  assert.throws(
    () =>
      runSecretProcess(
        "test",
        [],
        {},
        {},
        () => ({ status: 1 }),
        (temporary, options) => {
          cleanupCalled = true;
          assert.deepEqual(options, {
            recursive: true,
            force: true,
            maxRetries: 5,
            retryDelay: 200,
          });

          rmSync(temporary, { recursive: true, force: true });
          throw Object.assign(Error("SYNTHETIC_SECRET cleanup path"), {
            code: "ENOTEMPTY",
          });
        },
      ),
    (error) =>
      error.message.startsWith("Credential-consuming command failed;") &&
      error.message.includes("cleanup also failed") &&
      !error.message.includes("SYNTHETIC_SECRET"),
  );

  assert.equal(cleanupCalled, true);
});

test("cleanup failure after success is reported distinctly without leaking paths", () => {
  assert.throws(
    () =>
      runSecretProcess(
        "test",
        [],
        {},
        {},
        () => ({ status: 0 }),
        (temporary) => {
          rmSync(temporary, { recursive: true, force: true });
          throw Error("SYNTHETIC_SECRET cleanup path");
        },
      ),
    (error) =>
      error.message.includes("command succeeded") &&
      error.message.includes("cleanup failed") &&
      !error.message.includes("SYNTHETIC_SECRET"),
  );
});

test("a thrown subprocess error is sanitized and still cleans temporary data", () => {
  let cleaned = false;
  assert.throws(
    () =>
      runSecretProcess(
        "test",
        [],
        {},
        {},
        () => {
          throw Error("SYNTHETIC_SECRET");
        },
        (temporary, options) => {
          rmSync(temporary, options);
          cleaned = true;
        },
      ),
    (error) =>
      error.message.startsWith("Credential-consuming command failed;") &&
      !error.message.includes("SYNTHETIC_SECRET"),
  );

  assert.equal(cleaned, true);
});
