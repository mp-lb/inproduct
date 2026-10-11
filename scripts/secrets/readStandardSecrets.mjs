import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { decryptForumEncryptedFileText } from "@mp-lb/forum-secrets";
import { parseSecrets } from "./selectCredentials.mjs";

export const verifySnapshot = (text, source) => {
  let envelope;

  try {
    envelope = JSON.parse(text);
  } catch {
    throw Error("Invalid encrypted snapshot.");
  }

  if (
    source.store !== "mp-lb/mp-lb" ||
    source.path !== "/admin/standard-secrets.json.enc" ||
    source.fileId !== "214835ec-c206-4e52-a902-a0c4e8878135" ||
    !Number.isInteger(source.revision) ||
    createHash("sha256").update(text).digest("hex") !== source.sha256 ||
    envelope.doctrineEncryptedFile !== 3 ||
    envelope.cipher !== "AES-GCM" ||
    !Array.isArray(envelope.recipients)
  )
    throw Error("Encrypted snapshot provenance or integrity check failed.");
};

export const readStandardSecrets = async (root, key) => {
  if (!key) throw Error("SECRETS_KEY is required.");
  let text, source;

  try {
    text = readFileSync(
      resolve(root, ".secrets/standard-secrets.json.enc"),
      "utf8",
    );

    source = JSON.parse(
      readFileSync(
        resolve(root, ".secrets/standard-secrets.source.json"),
        "utf8",
      ),
    );
  } catch {
    throw Error("Encrypted snapshot or provenance is missing/invalid.");
  }

  verifySnapshot(text, source);
  let plaintext;

  try {
    plaintext = await decryptForumEncryptedFileText({
      encryptedText: text,
      recipientSecret: key,
    });
  } catch {
    throw Error("SECRETS_KEY cannot decrypt the pinned standard snapshot.");
  }

  return parseSecrets(plaintext);
};
