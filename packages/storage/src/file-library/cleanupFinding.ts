import type { FileRecord } from "./fileLibraryContracts.js";

const uploadGraceMs = 86_400_000;

/** Classifies one record for the report-only cleanup view. Never deletion authority. */
export const cleanupFinding = (
  file: FileRecord,
  now: number,
): { kind: "candidate" | "blocked"; reason: string } | null => {
  if (file.holds.some((hold) => hold.state !== "released"))
    return { kind: "blocked", reason: "retained by consumer" };
  if (file.state === "verifying")
    return { kind: "blocked", reason: "verification unresolved" };
  if (file.uploadUntil + uploadGraceMs > now)
    return { kind: "blocked", reason: "upload capability grace" };
  if (file.state === "pending" && file.expiresAt < now)
    return { kind: "candidate", reason: "expired upload; review only" };
  if (file.state === "deleted" || file.state === "quarantined")
    return { kind: "blocked", reason: "retention policy not approved" };
  return null;
};
