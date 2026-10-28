/** A full audit outbox rejects mutations until the dispatcher delivers events. */
export const maxPendingAudit = 2000;
