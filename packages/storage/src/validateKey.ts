export const validateKey = (key: string): void => {
  if (
    typeof key !== "string" ||
    key.length === 0 ||
    key.includes("\\") ||
    [...key].some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    ) ||
    key.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new TypeError("invalid storage key");
  }
};
