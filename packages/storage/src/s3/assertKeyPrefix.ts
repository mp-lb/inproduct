/** One or more slash-terminated segments of letters, digits, `_` and `-`. */
export const assertKeyPrefix = (prefix: string) => {
  if (!/^(?:[a-zA-Z0-9_-]+\/)+$/.test(prefix))
    throw new Error("invalid storage prefix");
};
