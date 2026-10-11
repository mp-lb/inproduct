const aliases = {
  deploy: ["VERCEL_TOKEN", "VERCEL_API_TOKEN"],
  publish: ["NPM_TOKEN", "NODE_AUTH_TOKEN"],
};

export const parseSecrets = (text) => {
  let values;

  try {
    values = JSON.parse(text);
  } catch {
    throw Error("Secrets must contain a JSON object (content omitted).");
  }

  if (!values || Array.isArray(values) || typeof values !== "object")
    throw Error("Secrets must contain a JSON object (content omitted).");
  return values;
};

export const selectCredentials = (values, consumer) => {
  const names = aliases[consumer];
  if (!names) throw Error("Unknown credential consumer.");
  const candidates = names.filter((name) => Object.hasOwn(values, name));
  if (
    !candidates.length ||
    candidates.some(
      (name) => typeof values[name] !== "string" || !values[name].trim(),
    )
  )
    throw Error(`Missing ${names[0]} in the authorized standard file.`);
  if (new Set(candidates.map((name) => values[name])).size !== 1)
    throw Error(
      `Conflicting ${names.join(" / ")} aliases in the standard file.`,
    );
  const token = values[candidates[0]];
  if (/[\r\n\0]/.test(token))
    throw Error(`Invalid ${names[0]} format (content omitted).`);
  return consumer === "deploy"
    ? { VERCEL_TOKEN: token }
    : { NPM_TOKEN: token, NODE_AUTH_TOKEN: token };
};
