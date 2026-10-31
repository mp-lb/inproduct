export const describeFailure = (error: unknown) =>
  error instanceof Error && error.message ? error.message : "Data job failed.";
