import { clamdRequest } from "./clamdRequest.js";
import { assertFreshClamd } from "./assertFreshClamd.js";

/** Malware scan for arbitrary-format private attachments that are always served as downloads. */
export const scanPrivateFileBytes = async (
  endpoint: string,
  bytes: Uint8Array,
  signal: AbortSignal,
) => {
  await assertFreshClamd(endpoint, Date.now(), signal);

  const result = await clamdRequest(
    endpoint,
    "INSTREAM",
    Buffer.from(bytes),
    signal,
  );

  if (result !== "stream: OK")
    throw new Error("attachment did not pass malware scanning");
};
