/** Media types a browser may execute or script when it renders them. */
export const isActiveMediaType = (id: string) =>
  /^text\/html$|xhtml|\+xml$|\/xml$|javascript|ecmascript|^image\/svg|shockwave|^text\/x-component$|^multipart\//.test(
    id,
  );
