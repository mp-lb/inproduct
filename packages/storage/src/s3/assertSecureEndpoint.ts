/** Requires HTTPS, except an explicit loopback HTTP allowance for local tests. */
export const assertSecureEndpoint = (
  endpoint: string | undefined,
  allowLoopbackHttp: boolean,
) => {
  if (!endpoint) return;
  const url = new URL(endpoint);
  if (
    url.protocol !== "https:" &&
    !(
      allowLoopbackHttp &&
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new Error("secure storage endpoint required");
};
