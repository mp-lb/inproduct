const maxCapabilitySeconds = 300;

/** Remaining capability lifetime in whole seconds, capped at five minutes. */
export const capabilitySeconds = (expiresAt: number, now = Date.now()) => {
  const seconds = Math.floor((expiresAt - now) / 1000);
  if (seconds < 1) throw new Error("storage capability expired");
  return Math.min(seconds, maxCapabilitySeconds);
};
