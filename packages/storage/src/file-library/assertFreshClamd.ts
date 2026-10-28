import { clamdRequest } from "./clamdRequest.js";

const maxSignatureAgeMs = 72 * 3_600_000;
const clockSkewMs = 3_600_000;

/** Rejects a scanner whose signature database is missing or older than 72 hours. */
export const assertFreshClamd = async (
  endpoint: string,
  now: number,
  signal?: AbortSignal,
) => {
  const info = await clamdRequest(endpoint, "VERSION", undefined, signal);
  const fields = info.split("/");
  const age = now - Date.parse(fields.at(-1) ?? "");
  if (
    !info.startsWith("ClamAV ") ||
    fields.length < 3 ||
    !Number.isFinite(age) ||
    age < -clockSkewMs ||
    age > maxSignatureAgeMs
  )
    throw new Error("scanner signatures are missing or stale");
};
