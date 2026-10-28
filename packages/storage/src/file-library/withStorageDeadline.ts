/** Times out read/sign/scan work only. This never authorizes a compensating deletion. */
export const withStorageDeadline = async <T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> => {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation(controller.signal),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error("storage operation timed out"));
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};
