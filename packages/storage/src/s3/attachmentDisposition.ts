/** RFC 5987 attachment disposition; encodes every unsafe character, including CR/LF. */
export const attachmentDisposition = (name: string) =>
  `attachment; filename*=UTF-8''${encodeURIComponent(name).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  )}`;
