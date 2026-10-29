const mediaTypePattern =
  /^[a-z0-9][a-z0-9!#$&^_.+-]{0,126}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}$/;

/** Lowercase `type/subtype` without parameters, or null when not a media type. */
export const normalizeMediaType = (value: string) => {
  const essence = value.split(";")[0]!.trim().toLowerCase();
  return mediaTypePattern.test(essence) ? essence : null;
};
