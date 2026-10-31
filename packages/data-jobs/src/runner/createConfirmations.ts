type Confirmation = { token: string; expiresAt: number };

/** Single-use confirmation tokens. Issuing a new one for a job replaces the previous one,
 * so a run is always confirmed against the latest inspection.
 */
export const createConfirmations = ({
  ttlMs,
  now,
}: {
  ttlMs: number;
  now: () => number;
}) => {
  const confirmations = new Map<string, Confirmation>();

  return {
    issue: (jobId: string): Confirmation => {
      const confirmation = {
        token: crypto.randomUUID(),
        expiresAt: now() + ttlMs,
      };

      confirmations.set(jobId, confirmation);
      return confirmation;
    },
    consume: (jobId: string, token: string) => {
      const confirmation = confirmations.get(jobId);
      if (!confirmation || confirmation.token !== token) return false;
      confirmations.delete(jobId);
      return confirmation.expiresAt > now();
    },
  };
};
