/** Formats whose bytes are text, so UTF-8 text is compatible content. */
export const isTextualMediaType = (id: string, charset?: string) =>
  !!charset ||
  id.startsWith("text/") ||
  /\+(?:json|xml|yaml)$|\/(?:json|xml|yaml|x-yaml|javascript|ecmascript|sql|x-sh|x-httpd-php)$/.test(
    id,
  );
